import { HttpRequestError } from "viem";
import { describe, expect, it } from "vitest";
import { g } from "../frost/math.js";
import { jsonReplacer } from "./json.js";

const json = (value: unknown) => JSON.stringify(value, jsonReplacer, 2);

describe("jsonReplacer", () => {
	it("should serialize big integers", () => {
		expect(json(1337n)).toEqual(json("1337"));
	});

	it("should serialize FROST points", () => {
		const point = g(42n);
		expect(json(point)).toEqual(
			json({
				x: point.x.toString(),
				y: point.y.toString(),
			}),
		);
	});

	it("should serialize errors", () => {
		const cause = new HttpRequestError({
			url: "https://example.com",
			status: 418,
		});
		const err = new Error("hello", { cause });
		expect(json(err)).toEqual(
			json({
				name: "Error",
				message: "hello",
				cause: {
					name: "HttpRequestError",
					message: cause.message,
					stack: cause.stack,
					metaMessages: cause.metaMessages,
					shortMessage: cause.shortMessage,
					version: cause.version,
					status: 418,
					url: "https://example.com",
				},
				stack: err.stack,
			}),
		);
	});
});
