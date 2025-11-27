import type { KeyGenClient } from "../../consensus/keyGen/client.js";
import type { ShieldnetProtocol } from "../../consensus/protocol/types.js";
import { triggerKeyGen } from "../keygen/trigger.js";
import type {
	ConsensusState,
	MachineConfig,
	MachineStates,
	StateDiff,
} from "../types.js";

export const checkEpochRollover = (
	machineConfig: MachineConfig,
	protocol: ShieldnetProtocol,
	keyGenClient: KeyGenClient,
	consensusState: ConsensusState,
	machineStates: MachineStates,
	block: bigint,
	logger?: (msg: unknown) => void,
): StateDiff => {
	const currentEpoch = block / machineConfig.blocksPerEpoch;
	if (
		consensusState.stagedEpoch > 0n &&
		consensusState.stagedEpoch <= currentEpoch
	) {
		logger?.(
			`Update active epoch from ${consensusState.activeEpoch} to ${consensusState.stagedEpoch}`,
		);
		// Update active epoch
		// TODO: refactor into state diff
		consensusState.activeEpoch = consensusState.stagedEpoch;
		consensusState.stagedEpoch = 0n;
	}
	// If no rollover is staged and new key gen was not triggered do it now
	if (
		machineStates.rollover.id === "waiting_for_rollover" &&
		consensusState.stagedEpoch === 0n
	) {
		// Trigger key gen for next epoch
		const nextEpoch = currentEpoch + 1n;
		logger?.(`Trigger key gen for epoch ${nextEpoch}`);
		const { diff } = triggerKeyGen(
			keyGenClient,
			consensusState,
			nextEpoch,
			block + machineConfig.keyGenTimeout,
			machineConfig.defaultParticipants,
			protocol.consensus(),
			logger,
		);
		return diff;
	}
	return {};
};
