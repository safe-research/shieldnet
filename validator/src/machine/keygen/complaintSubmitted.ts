import type { KeyGenClient } from "../../consensus/keyGen/client.js";
import type { ComplaintResponse } from "../../consensus/protocol/types.js";
import type { KeyGenComplaintSubmittedEvent } from "../transitions/types.js";
import type { MachineStates, RolloverState, StateDiff } from "../types.js";

export const handleComplaintSubmitted = async (
	keyGenClient: KeyGenClient,
	machineStates: MachineStates,
	event: KeyGenComplaintSubmittedEvent,
): Promise<StateDiff> => {
	if (machineStates.rollover.id !== "collecting_shares" && machineStates.rollover.id !== "collecting_confirmations") {
		return {};
	}

	if (machineStates.rollover.groupId !== event.gid) {
		return {};
	}

	if (
		machineStates.rollover.id === "collecting_confirmations" &&
		event.block > machineStates.rollover.complaintDeadline
	) {
		return {};
	}

	const accusedId = event.accused.toString();
	// Get or create complaints entry for accused
	const complaint = machineStates.rollover.complaints[accusedId] ?? { total: 0n, unresponded: 0n };
	// Copy complaints with update
	const complaints = {
		...machineStates.rollover.complaints,
		[accusedId]: {
			total: complaint.total + 1n,
			unresponded: complaint.unresponded + 1n,
		},
	};

	const rollover: RolloverState = {
		...machineStates.rollover,
		complaints,
	};
	if (event.accused !== keyGenClient.participantId(event.gid)) {
		return {
			rollover,
		};
	}
	// We are accused, reveal share for plaintiff
	const action: ComplaintResponse = {
		id: "key_gen_complaint_response",
		groupId: event.gid,
		plaintiff: event.plaintiff,
		secretShare: keyGenClient.createSecretShare(event.gid, event.plaintiff),
	};
	return {
		rollover,
		actions: [action],
	};
};
