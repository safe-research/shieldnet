import { toFunctionSelector } from "viem";
import type { TransactionCheck } from "../../handler.js";
import { FixedParamsCheck, SupportedSelectorCheck } from "../basic.js";
import { CombinedChecks } from "../combined.js";

const MigrationCheck = new CombinedChecks([
	new FixedParamsCheck({ operation: 1 }),
	new SupportedSelectorCheck(
		[
			toFunctionSelector("function migrateSingleton()"),
			toFunctionSelector("function migrateWithFallbackHandler()"),
			toFunctionSelector("function migrateL2Singleton()"),
			toFunctionSelector("function migrateL2WithFallbackHandler()"),
		],
		false,
	),
]);

export const SingletonUpgradeChecks: Record<string, TransactionCheck> = {
	"0x6439e7ABD8Bb915A5263094784C5CF561c4172AC": MigrationCheck,
	"0x526643F69b81B008F46d95CD5ced5eC0edFFDaC6": MigrationCheck,
};
