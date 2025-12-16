import http, { type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { Counter, collectDefaultMetrics, Gauge, Registry } from "prom-client";
import type { Logger } from "./logging.js";

// Collect some default NodeJS-related metrics.
const register = new Registry();

collectDefaultMetrics({
	prefix: "validator_",
	register,
});

export const metrics = {
	blockNumber: new Gauge({
		name: "validator_block_number",
		help: "The last processed block number by the validator",
		registers: [register],
	}),
	eventIndex: new Gauge({
		name: "validator_event_index",
		help: "The last processed event index by the validator",
		registers: [register],
	}),
	transitions: new Counter({
		name: "validator_transitions",
		help: "Validator state transitions",
		labelNames: ["result"],
		registers: [register],
	}),
};

export type MetricsServiceOptions = {
	logger: Logger;
	port?: number;
};

export class MetricsService {
	#logger: Logger;
	#server: Server;
	#port: number;

	constructor({ logger, port }: MetricsServiceOptions) {
		this.#logger = logger;
		this.#server = http.createServer((req, res) => this.handler(req, res));
		this.#port = port ?? 3555;
	}

	async start(): Promise<void> {
		await new Promise((resolve) => {
			this.#server.listen(
				{
					port: this.#port,
				},
				() => resolve(undefined),
			);
		});

		// In order to support `port = 0` for assigning a random port for
		// for serving the metrics, make sure to read it back from the server
		// address.
		if (this.#port === 0) {
			const address = this.#server.address();
			if (address === null || typeof address === "string") {
				throw new Error("unexpected null or string server address after start");
			}
			this.#port = address.port;
		}

		this.#logger.info(`serving metrics on :${this.#port}`);
	}

	stop(): Promise<void> {
		return new Promise((resolve) => {
			this.#server.on("close", () => resolve(undefined));
			this.#server.close();
		});
	}

	private async handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.url === "/metrics") {
			res.writeHead(200, { "Content-Type": register.contentType });
			res.end(await register.metrics());
		} else {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not Found\n");
		}
	}
}

export const createMetricsService = (options: MetricsServiceOptions): MetricsService => {
	return new MetricsService(options);
};
