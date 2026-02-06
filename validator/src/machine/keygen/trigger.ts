import type { Hex } from "viem";
import type { KeyGenClient } from "../../consensus/keyGen/client.js";
import type { ProtocolAction } from "../../consensus/protocol/types.js";
import type { Participant } from "../../consensus/storage/types.js";
import type { GroupId } from "../../frost/types.js";
import type { MachineConfig, StateDiff } from "../types.js";
import { calcGroupParameters, calcMinimumParticipants } from "./group.js";

export const triggerKeyGen = (
	machineConfig: MachineConfig,
	keyGenClient: KeyGenClient,
	epoch: bigint,
	deadline: bigint,
	participants: Participant[],
	context: Hex,
	logger?: (msg: unknown) => void,
): { groupId: GroupId; diff: StateDiff } => {
	const requiredParticipants = calcMinimumParticipants(machineConfig);
	if (participants.length < requiredParticipants) {
		throw new Error(`Not enough participants! Expected at least ${requiredParticipants} got ${participants.length}`);
	}
	const { count, threshold } = calcGroupParameters(participants.length);
	const { groupId, participantsRoot, participantId, commitments, pok, poap } = keyGenClient.setupGroup(
		participants,
		count,
		threshold,
		context,
	);

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
	return {
		groupId,
		diff: {
			consensus: {
				epochGroup: [epoch, { groupId, participantId }],
			},
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
