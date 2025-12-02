import type { ProtocolAction } from "../../consensus/protocol/types.js";
import type { ConsensusState, MachineStates, StateDiff } from "../types.js";

export type StateStorage = {
	applyDiff(diff: StateDiff): ProtocolAction[];
	consensusState(): ConsensusState;
	machineStates(): MachineStates;
};
