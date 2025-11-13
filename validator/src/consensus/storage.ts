import type { Address, Hex } from "viem";
import type { FrostPoint, GroupId, ParticipantId } from "../frost/types.js";
import { calculateParticipantsRoot } from "./merkle.js";
import type {
	GroupInfoStorage,
	KeyGenInfoStorage,
	Participant,
} from "./types.js";

type GroupInfo = {
	groupId: GroupId;
	participants: readonly Participant[];
	participantId: bigint;
	verificationShare?: FrostPoint;
	groupPublicKey?: FrostPoint;
	signingShare?: bigint;
};

type KeyGenInfo = {
	coefficients: readonly bigint[];
	commitments: Map<bigint, readonly FrostPoint[]>;
	secretShares: Map<bigint, bigint>;
};

export class InMemoryStorage implements KeyGenInfoStorage, GroupInfoStorage {
	#account: Address;
	#participantsInfo = new Map<Hex, readonly Participant[]>();
	#keyGenInfo = new Map<GroupId, KeyGenInfo>();
	#groupInfo = new Map<GroupId, GroupInfo>();

	constructor(account: Address) {
		this.#account = account;
	}

	private keyGenInfo(groupId: GroupId): KeyGenInfo {
		const info = this.#keyGenInfo.get(groupId);
		if (info === undefined) throw Error(`No keygen info for group ${groupId}!`);
		return info;
	}

	private groupInfo(groupId: GroupId): GroupInfo {
		const info = this.#groupInfo.get(groupId);
		if (info === undefined) throw Error(`Unknown group ${groupId}!`);
		return info;
	}

	private checkInformationComplete(
		participants: readonly Participant[],
		information: Map<bigint, unknown>,
	): boolean {
		for (const participant of participants) {
			if (!information.has(participant.id)) {
				return false;
			}
		}
		return true;
	}

	registerKeyGen(groupId: GroupId, coefficients: readonly bigint[]): void {
		// Check if group is known, otherwise this will throw
		this.groupInfo(groupId);
		if (this.#keyGenInfo.has(groupId))
			throw Error(`KeyGen for ${groupId} already registered!`);
		this.#keyGenInfo.set(groupId, {
			coefficients,
			commitments: new Map(),
			secretShares: new Map(),
		});
	}
	registerCommitments(
		groupId: GroupId,
		participantId: ParticipantId,
		commitments: readonly FrostPoint[],
	): void {
		const info = this.keyGenInfo(groupId);
		info.commitments.set(participantId, commitments);
	}
	registerSecretShare(
		groupId: GroupId,
		participantId: ParticipantId,
		share: bigint,
	): void {
		const info = this.keyGenInfo(groupId);
		info.secretShares.set(participantId, share);
	}
	checkIfCommitmentsComplete(groupId: GroupId): boolean {
		const participants = this.participants(groupId);
		const info = this.keyGenInfo(groupId);
		return this.checkInformationComplete(participants, info.commitments);
	}
	checkIfSecretSharesComplete(groupId: GroupId): boolean {
		const participants = this.participants(groupId);
		const info = this.keyGenInfo(groupId);
		return this.checkInformationComplete(participants, info.secretShares);
	}
	encryptionKey(groupId: GroupId): bigint {
		const info = this.keyGenInfo(groupId);
		return info.coefficients[0];
	}
	coefficients(groupId: GroupId): readonly bigint[] {
		const info = this.keyGenInfo(groupId);
		return info.coefficients;
	}
	commitments(
		groupId: GroupId,
		participantId: ParticipantId,
	): readonly FrostPoint[] {
		const info = this.keyGenInfo(groupId);
		const commitments = info.commitments.get(participantId);
		if (commitments === undefined)
			throw Error(`No commitments for ${participantId} available!`);
		return commitments;
	}
	commitmentsMap(groupId: GroupId): Map<ParticipantId, readonly FrostPoint[]> {
		const info = this.keyGenInfo(groupId);
		return info.commitments;
	}
	secretSharesMap(groupId: GroupId): Map<ParticipantId, bigint> {
		const info = this.keyGenInfo(groupId);
		return info.secretShares;
	}
	clearKeyGen(groupId: GroupId): void {
		this.#keyGenInfo.delete(groupId);
	}
	registerParticipants(participants: readonly Participant[]): Hex {
		const participantsHash = calculateParticipantsRoot(participants);
		this.#participantsInfo.set(participantsHash, participants);
		return participantsHash;
	}
	loadParticipants(hash: Hex): readonly Participant[] {
		const participants = this.#participantsInfo.get(hash);
		if (participants === undefined)
			throw Error(`Unknown participants hash ${hash}!`);
		return participants;
	}
	knownGroups(): GroupId[] {
		return Array.from(this.#groupInfo.values().map((g) => g.groupId));
	}
	registerGroup(
		groupId: GroupId,
		participants: readonly Participant[],
	): ParticipantId {
		if (this.#groupInfo.has(groupId))
			throw Error(`Group ${groupId} already registered!`);
		const participantId = participants.find(
			(p) => p.address === this.#account,
		)?.id;
		if (participantId === undefined)
			throw Error(`Not part of Group ${groupId}!`);
		this.#groupInfo.set(groupId, {
			participantId,
			groupId,
			participants,
		});
		return participantId;
	}
	registerVerification(
		groupId: GroupId,
		groupPublicKey: FrostPoint,
		verificationShare: FrostPoint,
	): void {
		const info = this.groupInfo(groupId);
		if (
			info.groupPublicKey !== undefined ||
			info.verificationShare !== undefined
		)
			throw Error(`Verification information for ${groupId} already set!`);
		info.groupPublicKey = groupPublicKey;
		info.verificationShare = verificationShare;
	}
	registerSigningShare(groupId: GroupId, signingShare: bigint): void {
		const info = this.groupInfo(groupId);
		if (info.signingShare !== undefined)
			throw Error(`Signing share for ${groupId} already set!`);
		info.signingShare = signingShare;
	}
	participantId(groupId: GroupId): ParticipantId {
		return this.groupInfo(groupId).participantId;
	}
	publicKey(groupId: GroupId): FrostPoint | undefined {
		return this.groupInfo(groupId).groupPublicKey;
	}
	participants(groupId: GroupId): readonly Participant[] {
		return this.groupInfo(groupId).participants;
	}
	verificationShare(groupId: GroupId): FrostPoint {
		const verificationShare = this.groupInfo(groupId).verificationShare;
		if (verificationShare === undefined)
			throw Error(`Verificatrion share not available for ${groupId}!`);
		return verificationShare;
	}
	unregisterGroup(groupId: GroupId): void {
		this.#groupInfo.delete(groupId);
	}
}
