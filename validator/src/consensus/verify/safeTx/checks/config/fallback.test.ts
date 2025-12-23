import { ethAddress } from "viem";
import { describe, expect, it } from "vitest";
import type { MetaTransaction } from "../../schemas.js";
import { FallbackHandlerCheck } from "./fallback.js";

describe("fallback", () => {
	describe("FallbackHandlerCheck", () => {
		it("skip if selector is not to setFallbackHandler", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x5afe",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new FallbackHandlerCheck();
			check.check(tx);
		});

		it("allow zero address as module guard (to reset)", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0xf08a03230000000000000000000000000000000000000000000000000000000000000000",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new FallbackHandlerCheck();
			check.check(tx);
		});

		it("should throw for unknown guard", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: `0xf08a0323000000000000000000000000${ethAddress.slice(2)}`,
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new FallbackHandlerCheck();
			expect(() => check.check(tx)).toThrow(
				"Cannot set unknown fallback handler 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			);
		});
	});
});
