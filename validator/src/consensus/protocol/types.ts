import type { Address, Hex } from "viem";
import type {
	FrostPoint,
	GroupId,
	ProofOfAttestationParticipation,
	ProofOfKnowledge,
	SignatureId,
} from "../../frost/types.js";
import type { PublicNonceCommitments } from "../signing/nonces.js";

export type KeyGenCoordinator = {
	chainId(): bigint;
	coordinator(): Address;
	triggerKeygenAndCommit(
		participants: Hex,
		count: bigint,
		threshold: bigint,
		context: Hex,
		id: bigint,
		commits: FrostPoint[],
		pok: ProofOfKnowledge,
		poap: ProofOfAttestationParticipation,
	): Promise<Hex>;

	publishKeygenCommitments(
		groupId: GroupId,
		id: bigint,
		commits: FrostPoint[],
		pok: ProofOfKnowledge,
		poap: ProofOfAttestationParticipation,
	): Promise<Hex>;

	publishKeygenSecretShares(
		groupId: GroupId,
		verificationShare: FrostPoint,
		peerShares: bigint[],
		callbackContext?: Hex,
	): Promise<Hex>;
};

export type SigningCoordinator = {
	chainId(): bigint;
	coordinator(): Address;

	publishNonceCommitmentsHash(
		groupId: GroupId,
		nonceCommitmentsHash: Hex,
	): Promise<Hex>;

	publishNonceCommitments(
		signatureId: SignatureId,
		nonceCommitments: PublicNonceCommitments,
		nonceProof: Hex[],
	): Promise<Hex>;

	publishSignatureShare(
		signatureId: SignatureId,
		signingParticipantsHash: Hex,
		signingParticipantsProof: Hex[],
		groupCommitement: FrostPoint,
		groupCommitementShare: FrostPoint, // add(d, mul(bindingFactor, e)
		signatureShare: bigint,
		lagrange: bigint,
		callbackContext?: Hex,
	): Promise<Hex>;
};

export type Consensus = {
	chainId(): bigint;
	consensus(): Address;
	proposeEpoch(
		proposedEpoch: bigint,
		rolloverAt: bigint,
		group: GroupId,
	): Promise<Hex>;

	stageEpoch(
		proposedEpoch: bigint,
		rolloverAt: bigint,
		group: GroupId,
		signature: SignatureId,
	): Promise<Hex>;
};

export type ShieldnetProtocol = KeyGenCoordinator &
	SigningCoordinator &
	Consensus;
