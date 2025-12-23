import { ethAddress } from "viem";
import { describe, expect, it } from "vitest";
import type { MetaTransaction } from "../../schemas.js";
import { AddModuleCheck, ModuleGuardCheck } from "./modules.js";

describe("modules", () => {
	describe("AddModuleCheck", () => {
		it("skip if selector is not to enableModule", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x5afe",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new AddModuleCheck();
			check.check(tx);
		});

		it("don't allow zero address as a module", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x610b59250000000000000000000000000000000000000000000000000000000000000000",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new AddModuleCheck();
			expect(() => check.check(tx)).toThrow("Cannot enable unknown module 0x0000000000000000000000000000000000000000");
		});

		it("should throw for unknown module", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: `0x610b5925000000000000000000000000${ethAddress.slice(2)}`,
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new AddModuleCheck();
			expect(() => check.check(tx)).toThrow("Cannot enable unknown module 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
		});
	});

	describe("ModuleGuardCheck", () => {
		it("skip if selector is not to setModuleGuard", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x5afe",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new ModuleGuardCheck();
			check.check(tx);
		});

		it("allow zero address as module guard (to reset)", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0xe068df370000000000000000000000000000000000000000000000000000000000000000",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new ModuleGuardCheck();
			check.check(tx);
		});

		it("should throw for unknown guard", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: `0xe068df37000000000000000000000000${ethAddress.slice(2)}`,
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new ModuleGuardCheck();
			expect(() => check.check(tx)).toThrow(
				"Cannot set unknown module guard 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			);
		});
	});
});
