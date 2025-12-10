import type { ShieldnetProtocol } from "../../consensus/protocol/types.js";
import type { VerificationEngine } from "../../consensus/verify/engine.js";
import type { EpochRolloverPacket } from "../../consensus/verify/rollover/schemas.js";
import type { EpochProposedEvent } from "../transitions/types.js";
import type { MachineStates, StateDiff } from "../types.js";

export const handleEpochProposed = async (
	protocol: ShieldnetProtocol,
	verificationEngine: VerificationEngine,
	machineStates: MachineStates,
	event: EpochProposedEvent,
	logger?: (msg: unknown) => void,
): Promise<StateDiff> => {
	// An epoch rollover was proposed, triggered by onKeyGenCompleted callback
	// Since we now compute the message locally in handleKeyGenConfirmed,
	// this handler validates that the on-chain event matches our computed state.

	logger?.(`EpochProposed: epoch ${event.proposedEpoch} with rollover block ${event.rolloverBlock}`);

	// We should be in sign_rollover state after all confirmations
	if (machineStates.rollover.id !== "sign_rollover") {
		logger?.(`Unexpected state ${machineStates.rollover.id} for EpochProposed`);
		return {};
	}

	// Validate that the proposed epoch matches our expected next epoch
	if (machineStates.rollover.nextEpoch !== event.proposedEpoch) {
		logger?.(`Epoch mismatch: expected ${machineStates.rollover.nextEpoch}, got ${event.proposedEpoch}`);
		return {};
	}

	// Create the epoch rollover packet to verify the message matches
	const packet: EpochRolloverPacket = {
		type: "epoch_rollover_packet",
		domain: {
			chain: protocol.chainId(),
			consensus: protocol.consensus(),
		},
		rollover: {
			activeEpoch: event.activeEpoch,
			proposedEpoch: event.proposedEpoch,
			rolloverBlock: event.rolloverBlock,
			groupKeyX: event.groupKey.x,
			groupKeyY: event.groupKey.y,
		},
	};

	// Verify the packet to get the message hash
	const message = await verificationEngine.verify(packet);

	// Validate that the message matches what we computed locally
	if (machineStates.rollover.message !== message) {
		logger?.(`Message mismatch: expected ${machineStates.rollover.message}, computed ${message}`);
		// This could indicate a discrepancy - for now, log and continue
		// The signing state should already be set up correctly
	} else {
		logger?.(`EpochProposed message verified: ${message}`);
	}

	// No state changes needed - we already set up the signing state in handleKeyGenConfirmed
	return {};
};
