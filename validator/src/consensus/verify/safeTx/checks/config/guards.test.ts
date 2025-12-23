import { ethAddress } from "viem";
import { describe, expect, it } from "vitest";
import type { MetaTransaction } from "../../schemas.js";
import { GuardCheck } from "./guards.js";

describe("guards", () => {
	describe("GuardCheck", () => {
		it("skip if selector is not to setGuard", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x5afe",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new GuardCheck();
			check.check(tx);
		});

		it("allow zero address as module guard (to reset)", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0xe19a9dd90000000000000000000000000000000000000000000000000000000000000000",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new GuardCheck();
			check.check(tx);
		});

		it("should throw for unknown guard", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: `0xe19a9dd9000000000000000000000000${ethAddress.slice(2)}`,
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new GuardCheck();
			expect(() => check.check(tx)).toThrow("Cannot set unknown guard 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
		});
	});
});
