import { type Address, encodePacked } from "viem";
import type { KeyGenClient } from "../../consensus/keyGen/client.js";
import type { ProtocolAction } from "../../consensus/protocol/types.js";
import type { Participant } from "../../consensus/storage/types.js";
import type { GroupId } from "../../frost/types.js";
import type { ConsensusState, StateDiff } from "../types.js";

export const triggerKeyGen = (
	keyGenClient: KeyGenClient,
	consensusState: ConsensusState,
	epoch: bigint,
	deadline: bigint,
	participants: Participant[],
	consensus: Address,
	logger?: (msg: unknown) => void,
): { groupId: GroupId; diff: StateDiff } => {
	if (participants.length < 2) {
		throw Error("Not enough participatns!");
	}
	// 4 bytes version, 20 bytes address, 8 bytes epoch number
	const context = encodePacked(
		["uint32", "address", "uint64"],
		[0, consensus, epoch],
	);
	const participantsRoot = keyGenClient.registerParticipants(participants);
	const count = BigInt(participants.length);
	const threshold = count / 2n + 1n;
	const { groupId, participantId, commitments, pok, poap } =
		keyGenClient.setupGroup(participantsRoot, count, threshold, context);

	const actions: ProtocolAction[] = [
		{
			id: "key_gen_start",
			participants: participantsRoot,
			count,
			threshold,
			context,
			participantId,
			commitments,
			pok,
			poap,
		},
	];

	logger?.(`Triggered key gen for epoch ${epoch} with ${groupId}`);
	// TODO: refactor to state diff
	consensusState.epochGroups.set(epoch, groupId);
	return {
		groupId,
		diff: {
			rollover: {
				id: "collecting_commitments",
				nextEpoch: epoch,
				groupId,
				deadline: deadline,
			},
			actions,
		},
	};
};
