import { encodePacked, type Hex, keccak256 } from "viem";
import type { FrostPoint, GroupId, SignatureId } from "../../frost/types.js";
import type { KeygenInfo } from "../client.js";
import { generateMerkleProof, generateMerkleProofWithRoot } from "../merkle.js";
import type { SigningCoordinator } from "../types.js";
import { groupChallenge, lagrangeCoefficient } from "./group.js";
import {
	bindingFactors,
	createNonceTree,
	groupCommitement,
	groupCommitementShares,
	type NonceCommitments,
	type NonceTree,
	type PublicNonceCommitments,
} from "./nonces.js";
import {
	createSigningShare as createSignatureShare,
	lagrangeChallange,
} from "./shares.js";

const SEQUENCE_CHUNK_SIZE = 1024n;

type SignatureRequest = {
	sequence: bigint;
	groupId: Hex;
	message: Hex;
	signerNonceCommitments: Map<bigint, PublicNonceCommitments>;
	signers: bigint[];
};

const checkInformationComplete = (
	signers: bigint[],
	information: Map<bigint, unknown>,
): boolean => {
	for (const signer of signers) {
		if (!information.has(signer)) {
			return false;
		}
	}
	return true;
};

export class SigningClient {
	#coordinator: SigningCoordinator;
	#keyGenInfo = new Map<GroupId, KeygenInfo>();
	#nonceCommits = new Map<Hex, NonceTree>();
	#chunkNonces = new Map<Hex, Hex>();
	#signatureRequests = new Map<Hex, SignatureRequest>();

	constructor(coordinator: SigningCoordinator) {
		this.#coordinator = coordinator;
	}

	async commitNonces(groupId: GroupId) {
		const info = this.#keyGenInfo.get(groupId);
		if (info?.signingShare === undefined) throw Error(`No info for ${groupId}`);
		const nonceTree = createNonceTree(info?.signingShare, SEQUENCE_CHUNK_SIZE);
		this.#nonceCommits.set(nonceTree.root, nonceTree);
		await this.#coordinator.publishNonceCommitmentsHash(
			groupId,
			nonceTree.root,
		);
	}

	private getNonceCommitments(
		groupId: GroupId,
		sequence: bigint,
	): {
		nonceCommitments: NonceCommitments;
		nonceProof: Hex[];
	} {
		// TODO: extract nonce tree into separate class
		const chunk = sequence / SEQUENCE_CHUNK_SIZE;
		const chunkId = keccak256(
			encodePacked(["bytes32", "uint256"], [groupId, chunk]),
		);

		const nonceCommitmentsHash = this.#chunkNonces.get(chunkId);
		if (nonceCommitmentsHash === undefined)
			throw Error(`Unknown chunk ${chunk} for group ${groupId}`);

		const nonceTree = this.#nonceCommits.get(nonceCommitmentsHash);
		if (nonceTree === undefined)
			throw Error(`Unknown nonce commitments hash: ${nonceCommitmentsHash}`);

		const nonceOffset = Number(sequence % SEQUENCE_CHUNK_SIZE);
		const nonceCommitments = nonceTree.commitments[nonceOffset];
		const nonceProof = generateMerkleProof(nonceTree.leaves, nonceOffset);
		return {
			nonceCommitments,
			nonceProof,
		};
	}

	async handleNonceCommitmentsHash(
		groupId: GroupId,
		participantIndex: bigint,
		nonceCommitmentsHash: Hex,
		chunk: bigint,
	) {
		const info = this.#keyGenInfo.get(groupId);
		// Only link own nonce commitments
		if (info?.participantIndex !== participantIndex) return;
		const chunkId = keccak256(
			encodePacked(["bytes32", "uint256"], [groupId, chunk]),
		);
		if (this.#chunkNonces.has(chunkId))
			throw Error(`Chunk ${groupId}:${chunk} has already be linked`);
		this.#chunkNonces.set(chunkId, nonceCommitmentsHash);
	}

	async handleSignatureRequest(
		groupId: GroupId,
		signatureId: SignatureId,
		message: Hex,
		sequence: bigint,
	) {
		const info = this.#keyGenInfo.get(groupId);
		if (info === undefined) throw Error(`No info for ${groupId}`);
		if (this.#signatureRequests.has(signatureId))
			throw Error(`Already handled signature request: ${signatureId}`);
		// TODO: check if we really want to sign the message

		const { nonceCommitments, nonceProof } = this.getNonceCommitments(
			groupId,
			sequence,
		);

		const signerNonceCommitments = new Map<bigint, PublicNonceCommitments>();
		// Set own nonce commitments
		signerNonceCommitments.set(info.participantIndex, nonceCommitments);
		this.#signatureRequests.set(signatureId, {
			sequence,
			message,
			signerNonceCommitments,
			groupId: info.groupId,
			signers: info.participants.map((p) => p.id).sort(),
		});
		await this.#coordinator.publishNonceCommitments(
			signatureId,
			nonceCommitments,
			nonceProof,
		);
	}

	async handleNonceCommitments(
		signatureId: SignatureId,
		peerIndex: bigint,
		nonceCommitments: PublicNonceCommitments,
	) {
		const signatureRequest = this.#signatureRequests.get(signatureId);
		if (signatureRequest === undefined)
			throw Error(`Unknown signature request: ${signatureId}`);

		// TODO skip own commitment
		if (signatureRequest.signerNonceCommitments.has(peerIndex))
			throw Error(`Already registered nonce commitments for ${peerIndex}`);

		signatureRequest.signerNonceCommitments.set(peerIndex, nonceCommitments);

		if (
			checkInformationComplete(
				signatureRequest.signers,
				signatureRequest.signerNonceCommitments,
			)
		) {
			await this.submitSignature(signatureId, signatureRequest);
		}
	}

	private async submitSignature(
		signatureId: SignatureId,
		signatureRequest: SignatureRequest,
	) {
		const groupInfo = this.#keyGenInfo.get(signatureRequest.groupId);
		if (groupInfo === undefined || groupInfo.signingShare === undefined)
			throw Error(`Missing info for ${signatureRequest.groupId}`);

		const signers = signatureRequest.signers;
		const signerId = groupInfo.participantIndex;
		const signerIndex = signatureRequest.signers.indexOf(signerId);

		// Calculate information over the complete signer group
		const groupPublicKey = undefined as unknown as FrostPoint;
		const bindingFactorList = bindingFactors(
			groupPublicKey,
			signers,
			signatureRequest.signerNonceCommitments,
			signatureRequest.message,
		);
		const groupCommitmentShares = groupCommitementShares(
			bindingFactorList,
			signatureRequest.signerNonceCommitments,
		);
		const groupCommitment = groupCommitement(groupCommitmentShares);
		const challenge = groupChallenge(
			groupCommitment,
			groupPublicKey,
			signatureRequest.message,
		);
		const signerParts = signers.map((signerId, index) => {
			const nonceCommitments =
				signatureRequest.signerNonceCommitments.get(signerId);
			if (nonceCommitments === undefined)
				throw Error(`Missing nonce commitments for ${signerId}`);
			const r = groupCommitmentShares[index];
			const coeff = lagrangeCoefficient(signers, signerId);
			const cl = lagrangeChallange(coeff, challenge);
			const node = encodePacked(
				["uint256", "uint256", "uint256", "uint256"],
				[signerId, r.x, r.y, cl],
			);
			return {
				signerId,
				r,
				cl,
				node,
			};
		});

		// Calculate information specific to this signer
		const { nonceCommitments } = this.getNonceCommitments(
			signatureRequest.groupId,
			signatureRequest.sequence,
		);
		const signerPart = signerParts[signerIndex];
		const signatureShare = createSignatureShare(
			groupInfo.signingShare,
			nonceCommitments,
			bindingFactorList[signerIndex].bindingFactor,
			signerPart.cl,
		);
		const { proof: signingParticipantsProof, root: signingParticipantsHash } =
			generateMerkleProofWithRoot(
				signerParts.map((p) => p.node),
				signerIndex,
			);

		await this.#coordinator.publishSignatureShare(
			signatureId,
			signingParticipantsHash,
			signerPart.r,
			signatureShare,
			signerPart.cl,
			signingParticipantsProof,
		);
	}
}
