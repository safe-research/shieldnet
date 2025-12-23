import { toFunctionSelector } from "viem";
import type { TransactionCheck } from "../../handler.js";
import { FixedParamsCheck, SupportedSelectorCheck } from "../basic.js";
import { CombinedChecks } from "../combined.js";

const SignCheck = new CombinedChecks([
	new FixedParamsCheck({ operation: 1 }),
	new SupportedSelectorCheck([toFunctionSelector("function signMessage(bytes)")], false),
]);

export const SignMessageChecks: Record<string, TransactionCheck> = {
	"0xA65387F16B013cf2Af4605Ad8aA5ec25a2cbA3a2": SignCheck,
	"0x98FFBBF51bb33A056B08ddf711f289936AafF717": SignCheck,
	"0xd53cd0aB83D845Ac265BE939c57F53AD838012c9": SignCheck,
	"0x4FfeF8222648872B3dE295Ba1e49110E61f5b5aa": SignCheck,
};
