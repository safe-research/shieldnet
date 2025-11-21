import fs from "node:fs";
import path from "node:path";
import {
	type Address,
	createPublicClient,
	createTestClient,
	createWalletClient,
	http,
	parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { describe, expect, it } from "vitest";
import { log } from "../__tests__/logging.js";
import type { GroupId } from "../frost/types.js";
import { ShieldnetStateMachine as SchildNetzMachine } from "../service/machine.js";
import { CONSENSUS_EVENTS, COORDINATOR_EVENTS } from "../types/abis.js";
import { KeyGenClient } from "./keyGen/client.js";
import { OnchainProtocol } from "./protocol.js";
import { SigningClient } from "./signing/client.js";
import { InMemoryStorage } from "./storage.js";
import type { Participant } from "./types.js";
import {
	type PacketHandler,
	type Typed,
	VerificationEngine,
} from "./verify/engine.js";
import { EpochRolloverHandler } from "./verify/rollover/handler.js";
import { SafeTransactionHandler } from "./verify/safeTx/handler.js";

const BLOCKTIME_IN_SECONDS = 1;
const BLOCKS_PER_EPOCH = 20n;
const TEST_RUNTIME_IN_SECONDS = 60;
const EXPECTED_GROUPS = TEST_RUNTIME_IN_SECONDS / Number(BLOCKS_PER_EPOCH) + 1;
/**
 * The integration test will bootstrap the setup from genesis and run for 1 minute.
 * Block time is 1 second, so 60 blocks will be mined.
 * Epoch time is 20 blocks per epoch.
 * It is expected that 4 groups will be created: genesis + 2 epoch rotations + 1 staged epoch
 */
describe("integration", () => {
	it(
		"keygen and signing flow",
		{ timeout: TEST_RUNTIME_IN_SECONDS * 1000 * 5 },
		async ({ skip }) => {
			// Make sure to first start the Anvil testnode (run `anvil` in the root)
			// and run the deployment script: forge script DeployScript --rpc-url --unlocked --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 http://127.0.0.1:8545 --broadcast
			const deploymentInfoFile = path.join(
				process.cwd(),
				"..",
				"contracts",
				"build",
				"broadcast",
				"Deploy.s.sol",
				"31337",
				"run-latest.json",
			);
			if (!fs.existsSync(deploymentInfoFile)) {
				// Deployment info not present
				skip();
			}
			const readClient = createPublicClient({
				chain: anvil,
				transport: http(),
			});
			try {
				await readClient.getBlockNumber();
			} catch {
				// Anvil not running
				skip();
			}
			const testClient = createTestClient({
				mode: "anvil",
				chain: anvil,
				transport: http(),
			});
			testClient.setIntervalMining({ interval: BLOCKTIME_IN_SECONDS });
			const deploymentInfo = JSON.parse(
				fs.readFileSync(deploymentInfoFile, "utf-8"),
			);
			const coordinatorAddress = deploymentInfo.returns["0"].value as Address;
			log(`Use coordinator at ${coordinatorAddress}`);
			const consensusAddress = deploymentInfo.returns["1"].value as Address;
			log(`Use consensus at ${consensusAddress}`);

			// Private keys from Anvil testnet
			const accounts = [
				privateKeyToAccount(
					"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
				),
				privateKeyToAccount(
					"0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
				),
				privateKeyToAccount(
					"0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
				),
			];
			const participants: Participant[] = accounts.map((a, i) => {
				return { id: BigInt(i + 1), address: a.address };
			});
			const clients = accounts.map((a, i) => {
				const publicClient = createPublicClient({
					chain: anvil,
					transport: http(),
					pollingInterval: 500,
				});
				const signingClient = createWalletClient({
					chain: anvil,
					transport: http(),
					account: a,
				});
				const protocol = new OnchainProtocol(
					publicClient,
					signingClient,
					consensusAddress,
					coordinatorAddress,
				);
				const storage = new InMemoryStorage(a.address);
				const sc = new SigningClient(storage, protocol, {
					onRequestSigned: (signatureId, participantId, message) => {
						log(
							`Participant ${participantId} signed request ${signatureId} for ${message}`,
						);
					},
				});
				const kc = new KeyGenClient(storage, protocol, {
					onGroupSetup: (groupId, participantId) => {
						log(`Participant ${participantId} is setup for group ${groupId}`);
					},
				});
				const verificationHandlers = new Map<string, PacketHandler<Typed>>();
				verificationHandlers.set(
					"safe_transaction_packet",
					new SafeTransactionHandler(),
				);
				verificationHandlers.set(
					"epoch_rollover_packet",
					new EpochRolloverHandler(),
				);
				const verificationEngine = new VerificationEngine(verificationHandlers);
				const logger = i === 0 ? console.log : undefined;
				const sm = new SchildNetzMachine({
					participants,
					protocol,
					keyGenClient: kc,
					signingClient: sc,
					verificationEngine,
					logger,
					blocksPerEpoch: BLOCKS_PER_EPOCH,
				});
				publicClient.watchContractEvent({
					address: [coordinatorAddress, consensusAddress],
					abi: [...CONSENSUS_EVENTS, ...COORDINATOR_EVENTS],
					onLogs: async (logs) => {
						for (const log of logs) {
							logger?.("New event at block ", log.blockNumber);
							try {
								await sm.processBlockEvent(
									log.blockNumber,
									log.logIndex,
									log.eventName,
									log.args,
								);
							} catch (e) {
								console.error(e);
							}
							logger?.("Handled event at block ", log.blockNumber);
						}
					},
					onError: console.error,
				});
				publicClient.watchBlockNumber({
					onBlockNumber: (block) => {
						logger?.("New block ", block);
						// We delay the processing to avoid potential race conditions for now
						setTimeout(async () => {
							logger?.("Process block ", block);
							try {
								await sm.progressToBlock(block);
							} catch (_e) {
								// Ignore erros here
							}
							logger?.("Processed block ", block);
						}, 2000);
					},
				});
				return {
					kc,
					sc,
					sm,
				};
			});
			const currentBlock = await readClient.getBlockNumber();
			for (const { sm } of clients) {
				await sm.progressToBlock(currentBlock);
			}
			// Setup done ... SchildNetz läuft ... lets send some signature requests
			const abi = parseAbi([
				"function groupKey(bytes32 id) external view returns ((uint256 x, uint256 y) memory key)",
				"function sign(bytes32 gid, bytes32 message) external returns (bytes32 sid)",
				"function groupSignature(bytes32 sid, bytes32 root) external view returns ((uint256 x, uint256 y) memory r, uint256 z)",
			]);
			/*
		setTimeout(async () => {
			const initiatorClient = createWalletClient({
				chain: anvil,
				transport: http(),
				account: accounts[0],
			});

			const message = keccak256(stringToBytes("Hello, Shieldnet!"));
			await initiatorClient.writeContract({
				address: consensusAddress,
				abi: abi,
				functionName: "sign",
				args: [message],
			});
		}, 22000)
		*/
			await new Promise((resolve) =>
				setTimeout(resolve, TEST_RUNTIME_IN_SECONDS * 1000),
			);
			const groups: Set<GroupId> = new Set();
			for (const { kc } of clients) {
				const knownGroups = kc.knownGroups();
				expect(knownGroups.length).toBe(EXPECTED_GROUPS);
				for (const groupId of knownGroups) {
					const groupKey = await readClient.readContract({
						address: coordinatorAddress,
						abi: abi,
						functionName: "groupKey",
						args: [groupId],
					});
					const localGroupKey = kc.groupPublicKey(groupId);
					expect(localGroupKey !== undefined).toBeTruthy();
					expect(localGroupKey?.x).toBe(groupKey.x);
					expect(localGroupKey?.y).toBe(groupKey.y);
					groups.add(groupId);
				}
			}
			// Genesis + 2 epoch rotations + 1 staged epoch
			expect(groups.size).toBe(EXPECTED_GROUPS);
			/*
		await new Promise((resolve) => setTimeout(resolve, 3000));
		for (const groupId of groups) {
			const signEvents = await readClient.getLogs({
				address: coordinatorAddress,
				event: parseAbiItem(
					"event Sign(address indexed initiator, bytes32 indexed gid, bytes32 indexed message, bytes32 sid, uint64 sequence)",
				),
				args: {
					gid: groupId,
					message: message,
				},
				fromBlock: "earliest",
				toBlock: "latest",
			});
			expect(signEvents.length).toBe(1);
			const sid = signEvents[0].args.sid;
			expect(sid).toBeDefined();
			const signShareEvent = await readClient.getLogs({
				address: coordinatorAddress,
				event: parseAbiItem(
					"event SignShared(bytes32 indexed sid, uint256 identifier, uint256 z, bytes32 root)",
				),
				args: {
					sid,
				},
				fromBlock: "earliest",
				toBlock: "latest",
			});
			expect(signShareEvent.length).toBeGreaterThan(0);
			const root = signShareEvent[0].args.root;
			expect(root).toBeDefined();
			const groupKey = await readClient.readContract({
				address: coordinatorAddress,
				abi: abi,
				functionName: "groupKey",
				args: [groupId],
			});
			const groupSignaure = await readClient.readContract({
				address: coordinatorAddress,
				abi: abi,
				functionName: "groupSignature",
				args: [sid as Hex, root as Hex],
			});
			expect(
				verifySignature(
					toPoint(groupSignaure[0]),
					groupSignaure[1],
					toPoint(groupKey),
					message,
				),
			).toBeTruthy();
		}
		*/
		},
	);
});
