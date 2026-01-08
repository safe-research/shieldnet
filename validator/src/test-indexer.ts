import Sqlite3 from "better-sqlite3";
import dotenv from "dotenv";
import { createPublicClient, extractChain, http } from "viem";
import { z } from "zod";
import { BlockIndexer } from "./indexing/blocks.js";
import { supportedChains } from "./types/chains.js";
import { validatorConfigSchema } from "./types/schemas.js";

dotenv.config({ quiet: true });

async function main() {
	const env = validatorConfigSchema.parse(process.env);

	const db = new Sqlite3("indexer.db");
	db.exec(`
		CREATE TABLE IF NOT EXISTS blocks (
			hash TEXT NOT NULL,
			number INTEGER NOT NULL,
			timestamp INTEGER NOT NULL,
			seen INTEGER NOT NULL,
			uncle INTEGER NOT NULL,
			PRIMARY KEY(hash)
		);

		CREATE TABLE IF NOT EXISTS metrics (
			id INTEGER NOT NULL,
			queries INTEGER NOT NULL,
			errors INTEGER NOT NULL,
			PRIMARY KEY(id) CHECK (id = 1)
		);

		INSERT INTO metrics (id, queries, errors)
		VALUES (1, 0, 0)
		ON CONFLICT(id) DO NOTHING;
	`);
	const q = {
		lastBlock: db.prepare("SELECT MAX(number) FROM blocks").pluck(true),
		incQueries: db.prepare("UPDATE metrics SET queries = queries + 1"),
		incErrors: db.prepare("UPDATE metrics SET errors = errors + 1"),
		newBlock: db.prepare(`
			INSERT INTO blocks (hash, number, timestamp, seen, uncle)
			VALUES (?, ?, ?, ?, FALSE)
			ON CONFLICT(hash) DO UPDATE SET uncle = FALSE
		`),
		uncleBlock: db.prepare("UPDATE blocks SET uncle = TRUE WHERE number >= ?"),
	};

	const chain = extractChain({
		id: env.CHAIN_ID,
		chains: supportedChains,
	});
	const client = createPublicClient({
		chain,
		transport: http(env.RPC_URL),
	});

	const lastIndexedBlock = z
		.int()
		.transform((i) => BigInt(i))
		.nullable()
		.parse(q.lastBlock.get());

	const config = {
		lastIndexedBlock,
		blockTime: chain.blockTime ?? 12000,
		maxReorgDepth: 5,
		// Hardcoded for Sepolia for testing.
		blockPropagationDelay: 2000,
		blockRetryDelays: [1000, 500, 300, 200],
	};
	const blocks = await BlockIndexer.create({
		client: {
			getBlock(b) {
				q.incQueries.run();
				return client.getBlock(b);
			},
		},
		...config,
	});

	console.log(config);
	while (true) {
		try {
			const record = await blocks.next();
			switch (record.type) {
				case "record_warp_to_block": {
					console.log(`warping from ${record.fromBlock} to ${record.toBlock}`);
					break;
				}
				case "record_uncle_block": {
					console.log(`uncle-ing ${record.blockNumber}`);
					q.uncleBlock.run(record.blockNumber);
					break;
				}
				case "record_new_block": {
					console.log(`new block ${record.blockNumber}`);
					const seen = Date.now();
					q.newBlock.run(record.blockHash, record.blockNumber, record.blockTimestamp, seen);
					break;
				}
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "unknown error";
			console.error(`ERROR: ${message}`);
			q.incErrors.run();
		}
	}
}

main().catch((error: unknown) => {
	console.error("Service failed to start:");
	console.error(error);
	process.exit(1);
});

export default {};
