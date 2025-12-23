import { type Address, zeroAddress } from "viem";
import { createConfigCheck } from "./base.js";

const ALLOWED_GUARDS: Address[] = [
	// No guards allowed right now!
];

export const GuardCheck = createConfigCheck("function setGuard(address)", ([guard]) => {
	if (guard !== zeroAddress && !ALLOWED_GUARDS.includes(guard)) {
		throw Error(`Cannot set unknown guard ${guard}`);
	}
});
