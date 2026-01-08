import Sqlite3 from "better-sqlite3";
import dotenv from "dotenv";
import { type Address, createPublicClient, extractChain, formatEther, http, parseAbi } from "viem";
import { z } from "zod";
import { supportedChains } from "./types/chains.js";
import { validatorConfigSchema } from "./types/schemas.js";
import { createLogger } from "./utils/logging.js";
import { watchBlocksAndEvents } from "./watcher/index.js";

dotenv.config({ quiet: true });

async function main() {
	const logger = createLogger({ level: "debug", pretty: true });
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

		CREATE TABLE IF NOT EXISTS events (
			blockNumber INTEGER NOT NULL,
			logIndex INTEGER NOT NULL,
			encoded TEXT NOT NULL,
			reorged INTEGER NOT NULL,
			PRIMARY KEY(blockNumber, logIndex)
		);

		CREATE TABLE IF NOT EXISTS metrics (
			id INTEGER NOT NULL,
			blockQueries INTEGER NOT NULL,
			logQueries INTEGER NOT NULL,
			errors INTEGER NOT NULL,
			PRIMARY KEY(id) CHECK (id = 1)
		);

		INSERT INTO metrics (id, blockQueries, logQueries, errors)
		VALUES (1, 0, 0, 0)
		ON CONFLICT(id) DO NOTHING;
	`);
	const q = {
		lastBlock: db.prepare("SELECT MAX(number) FROM blocks").pluck(true),
		newBlock: db.prepare(`
			INSERT INTO blocks (hash, number, timestamp, seen, uncle)
			VALUES (?, ?, ?, ?, FALSE)
			ON CONFLICT(hash) DO UPDATE SET uncle = FALSE
		`),
		uncleBlock: db.prepare("UPDATE blocks SET uncle = TRUE WHERE number >= ?"),
		newEvent: db.prepare(`
			INSERT INTO events (blockNumber, logIndex, encoded, reorged)
			VALUES (?, ?, ?, FALSE)
			ON CONFLICT(blockNumber, logIndex) DO UPDATE SET reorged = FALSE
		`),
		reorgEvents: db.prepare("UPDATE events SET reorged = TRUE WHERE blockNumber >= ?"),
		incBlockQueries: db.prepare("UPDATE metrics SET blockQueries = blockQueries + 1"),
		incLogQueries: db.prepare("UPDATE metrics SET logQueries = logQueries + 1"),
		incErrors: db.prepare("UPDATE metrics SET errors = errors + 1"),
	};
	const t = {
		reorg: db.transaction((blockNumber: bigint) => {
			q.uncleBlock.run(blockNumber);
			q.reorgEvents.run(blockNumber);
		}),
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

	// Hardcoded for Sepolia for testing.
	const config = {
		// Block watcher configuration
		lastIndexedBlock,
		blockTime: chain.blockTime ?? 12000,
		maxReorgDepth: 5,
		blockPropagationDelay: 2000,
		blockRetryDelays: [1000, 500, 300, 200],
		// Event watcher configuration
		blockPageSize: 100,
		blockSingleQueryRetryCount: 3,
		maxLogsPerQuery: 500,
		fallibleEvents: ["Deposit", "Withdrawal"],
	};
	const watch = {
		address: ["0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"] as Address[],
		events: parseAbi([
			"event Approval(address indexed src, address indexed guy, uint wad)",
			"event Transfer(address indexed src, address indexed dst, uint wad)",
			"event Deposit(address indexed dst, uint wad)",
			"event Withdrawal(address indexed src, uint wad)",
		]),
	} as const;
	logger.notice(config);

	await watchBlocksAndEvents({
		...config,
		...watch,
		logger,
		client: {
			getBlock(b) {
				q.incBlockQueries.run();
				return client.getBlock(b);
			},
			// biome-ignore-start lint/suspicious/noExplicitAny: TypeScript really struggles with the types here...
			getLogs(l: any) {
				q.incLogQueries.run();
				return client.getLogs(l) as any;
			},
			// biome-ignore-end lint/suspicious/noExplicitAny: TypeScript really struggles with the types here...
		},
		handler: (update) => {
			switch (update.type) {
				case "watcher_update_warp_to_block": {
					logger.info(`warping from ${update.fromBlock} to ${update.toBlock}`);
					break;
				}
				case "watcher_update_uncle_block": {
					logger.info(`uncle-ing ${update.blockNumber}`);
					t.reorg(update.blockNumber);
					break;
				}
				case "watcher_update_new_block": {
					logger.info(`new block ${update.blockNumber}`);
					const seen = Date.now();
					q.newBlock.run(update.blockHash, update.blockNumber, update.blockTimestamp, seen);
					break;
				}
				case "watcher_update_new_logs": {
					for (const log of update.logs) {
						logger.debug(`new ${log.eventName} event`);
						q.newEvent.run(
							log.blockNumber,
							log.logIndex,
							JSON.stringify({
								address: log.address,
								name: log.eventName,
								args: {
									...log.args,
									wad: formatEther(log.args.wad),
								},
							}),
						);
					}
				}
			}
		},
	});
}

main().catch((error: unknown) => {
	console.error("indexer failed to start:");
	console.error(error);
	process.exit(1);
});

export default {};
