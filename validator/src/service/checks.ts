import { NoDelegateCallCheck } from "../consensus/verify/safeTx/checks/basic.js";
import { AddressSplitCheck, CombinedChecks } from "../consensus/verify/safeTx/checks/combined.js";
import { FallbackHandlerCheck } from "../consensus/verify/safeTx/checks/config/fallback.js";
import { GuardCheck } from "../consensus/verify/safeTx/checks/config/guards.js";
import { SignMessageChecks } from "../consensus/verify/safeTx/checks/config/messages.js";
import { AddModuleCheck, ModuleGuardCheck } from "../consensus/verify/safeTx/checks/config/modules.js";
import { SingletonUpgradeChecks } from "../consensus/verify/safeTx/checks/config/singletons.js";
import { MutliSend130Check } from "../consensus/verify/safeTx/checks/multisend.js";
import type { TransactionCheck } from "../consensus/verify/safeTx/handler.js";

export const buildSafeTransactionCheck = (): TransactionCheck => {
	// All base checks always have to pass
	const baseChecks = new CombinedChecks([
		new AddModuleCheck(),
		new ModuleGuardCheck(),
		new GuardCheck(),
		new FallbackHandlerCheck(),
		new NoDelegateCallCheck(),
	]);
	// Allowed delegate calls, otherwise fallback to base checks
	const allowedDelegateCalls = new AddressSplitCheck(
		{
			...SingletonUpgradeChecks,
			...SignMessageChecks,
		},
		baseChecks,
	);
	// Add multisend checks, if not multisend, fallback to other allowed delegate calls
	const multiSendCheck = new MutliSend130Check(baseChecks);
	const supportedMultiSendChecks = new AddressSplitCheck(
		{
			"0xA83c336B20401Af773B6219BA5027174338D1836": multiSendCheck,
			"0x9641d764fc13c8B624c04430C7356C1C7C8102e2": multiSendCheck,
			"0x40A2aCCbd92BCA938b02010E17A5b8929b49130D": multiSendCheck,
		},
		allowedDelegateCalls,
	);
	return supportedMultiSendChecks;
};
