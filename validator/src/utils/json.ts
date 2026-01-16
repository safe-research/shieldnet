import type { FrostPoint } from "../frost/types.js";

export function jsonReplacer(_key: string, value: unknown): unknown {
	if (typeof value === "bigint") {
		return value.toString();
	}
	// Handle FrostPoint / Noble Curve Points
	// We check for specific methods defined in your interface to identify it.
	if (value && typeof value === "object" && "assertValidity" in value && "x" in value && "y" in value) {
		// Noble curve points usually keep x/y as getters.
		// Accessing value.x triggers the conversion from Projective (X,Y,Z) -> Affine (x,y).
		const point = value as FrostPoint;
		return {
			x: point.x.toString(), // Convert BigInt to string
			y: point.y.toString(), // Convert BigInt to string
		};
	}
	// Handle errors.
	if (value instanceof Error) {
		return {
			// The default Error fields are not enumerable, so we need to manually read them, as
			// they will not be included by the `...` splat operation.
			name: value.name,
			message: value.message,
			cause: value.cause,
			stack: value.stack,

			// Type assert to prevert compiler errors saying that `message` field above will be
			// overwritten (which is not true as `message` is not enumerable for errors).
			...(value as object),
		};
	}
	return value;
}
