import { describe, expect, it } from "vitest";
import type { MetaTransaction } from "../../schemas.js";
import { createConfigCheck } from "./base.js";

describe("base", () => {
	describe("createConfigCheck", () => {
		const TestCheck = createConfigCheck("function testCheck()", () => {
			throw Error("Test check was called!");
		});

		it("should skip transactions that are not to self", async () => {
			const tx: MetaTransaction = {
				to: "0x6439e7ABD8Bb915A5263094784C5CF561c4172AC",
				value: 0n,
				data: "0x",
				operation: 1,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new TestCheck();
			check.check(tx);
		});

		it("should not allow delegatecalls", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x",
				operation: 1,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new TestCheck();
			expect(() => check.check(tx)).toThrow("Delegatecall not allowed");
		});

		it("should not allow value", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 1n,
				data: "0x",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new TestCheck();
			expect(() => check.check(tx)).toThrow("Expected no value got 1");
		});

		it("skip if selector is too short", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x5afe",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new TestCheck();
			check.check(tx);
		});

		it("skip if selector does not match", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0x5afe5afe",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new TestCheck();
			check.check(tx);
		});

		it("call check if selector matches", async () => {
			const tx: MetaTransaction = {
				to: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
				value: 0n,
				data: "0xd6abbc75",
				operation: 0,
				nonce: 0n,
				chainId: 1n,
				account: "0xF01888f0677547Ec07cd16c8680e699c96588E6B",
			};
			const check = new TestCheck();
			expect(() => check.check(tx)).toThrow("Test check was called!");
		});
	});
});
