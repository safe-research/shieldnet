import type { PublicActions } from "viem";
import { vi } from "vitest";

export const waitForBlock = (client: PublicActions, target: bigint) =>
	vi.waitFor(
		async () => {
			// Continue shortly before the epoch is over
			const current = await client.getBlockNumber({ cacheTime: 0 });
			if (current < target) throw new Error("Wait!");
		},
		{ timeout: 20000 },
	);

export const waitForBlocks = async (client: PublicActions, amount: bigint) => {
	const current = await client.getBlockNumber({ cacheTime: 0 });
	const target = current + amount;
	return waitForBlock(client, target);
};
