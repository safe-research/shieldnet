import { addmod, mulmod } from "../../frost/math.js";
import type { SecretNonceCommitments } from "./nonces.js";

export const lagrangeChallange = (
	langrangeCoefficient: bigint,
	challenge: bigint,
): bigint => mulmod(challenge, langrangeCoefficient);

export const createSignatureShare = (
	privateKeyShare: bigint,
	nonces: SecretNonceCommitments,
	bindingFactor: bigint,
	lagrangeChallange: bigint,
): bigint => {
	return addmod(
		nonces.hidingNonce,
		addmod(
			mulmod(nonces.bindingNonce, bindingFactor),
			mulmod(lagrangeChallange, privateKeyShare),
		),
	);
};
