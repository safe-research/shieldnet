import { type Address, zeroAddress } from "viem";
import { createConfigCheck } from "./base.js";

const ALLOWED_MODULES: Address[] = [
	// No modules allowed right now!
];

export const AddModuleCheck = createConfigCheck("function enableModule(address)", ([module]) => {
	if (!ALLOWED_MODULES.includes(module)) {
		throw Error(`Cannot enable unknown module ${module}`);
	}
});

const ALLOWED_MODULE_GUARDS: Address[] = [
	// No module guards allowed right now!
];

export const ModuleGuardCheck = createConfigCheck("function setModuleGuard(address)", ([guard]) => {
	if (guard !== zeroAddress && !ALLOWED_MODULE_GUARDS.includes(guard)) {
		throw Error(`Cannot set unknown module guard ${guard}`);
	}
});
