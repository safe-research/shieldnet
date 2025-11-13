import { randomBytes } from "node:crypto";
import { bytesToNumberBE } from "@noble/curves/utils.js";
import {
	createPublicClient,
	createWalletClient,
	type Hex,
	http,
	keccak256,
	parseAbi,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { describe, expect, it } from "vitest"; // or '@jest/globals'
import { toPoint } from "../frost/math.js";
import type {
	FrostPoint,
	GroupId,
	ProofOfAttestationParticipation,
	ProofOfKnowledge,
} from "../frost/types.js";
import { watchCoordinatorEvents } from "../service/watchers.js";
import {
	keyGenCommittedEventSchema,
	keyGenEventSchema,
	keyGenSecretSharedEventSchema,
} from "../types/schemas.js";
import { FrostClient } from "./client.js";
import { OnchainCoordinator } from "./coordinator.js";
import {
	calculateParticipantsRoot,
	hashParticipant,
	verifyMerkleProof,
} from "./merkle.js";
import type { FrostCoordinator, Participant } from "./types.js";
import { linkClientToCoordinator } from "./events.js";

const createRandomAccount = () => privateKeyToAccount(generatePrivateKey());

// --- Tests ---
describe("client", () => {
	it("e2e keygen flow", async () => {
		const log = (msg: unknown) => {
			if (process.env.VERBOSE) console.log(msg)
		}
		const count = 3n;
		const threshold = count / 2n + 1n;
		const validatorAddresses = Array.from({ length: Number(count) }, () =>
			createRandomAccount(),
		);
		log(`Run test with ${count} validators and threshold ${threshold}`);
		const participants: Participant[] = validatorAddresses.map((a, i) => {
			return { index: BigInt(i + 1), address: a.address };
		});
		const participantsRoot = calculateParticipantsRoot(participants);
		const commitmentEvents: {
			groupId: GroupId;
			index: bigint;
			commits: FrostPoint[];
			pok: ProofOfKnowledge;
		}[] = [];
		const shareEvents: {
			groupId: GroupId;
			index: bigint;
			verificationShare: FrostPoint;
			peerShares: bigint[];
		}[] = [];
		const clients = validatorAddresses.map(
			(a) => {
				const participantIndexMapping = new Map<GroupId, bigint>()
				const coordinator: FrostCoordinator = {
					publishKeygenCommitments: (
						groupId: GroupId,
						index: bigint,
						commits: FrostPoint[],
						pok: ProofOfKnowledge,
						poap: ProofOfAttestationParticipation,
					): Promise<Hex> => {
						participantIndexMapping.set(groupId, index)
						log("##### Received KeygenCommitments #####");
						log({
							groupId,
							index,
							commits,
							pok,
							poap,
						});
						const leaf = participants.find((p) => p.index === index);
						if (leaf === undefined) throw Error(`Invliad index: ${index}`);
						log({
							validMerkleProof: verifyMerkleProof(
								participantsRoot,
								hashParticipant(leaf),
								poap,
							),
						});
						log("######################################");
						commitmentEvents.push({
							groupId,
							index,
							commits,
							pok,
						});
						return Promise.resolve("0x");
					},
					publishKeygenSecretShares: (
						groupId: GroupId,
						verificationShare: FrostPoint,
						peerShares: bigint[],
					): Promise<Hex> => {
						log("##### Received KeygenSecretShares #####");
						log({
							groupId,
							verificationShare,
							peerShares,
						});
						log("#######################################");
						const index = participantIndexMapping.get(groupId) ?? -1n
						shareEvents.push({
							groupId,
							index,
							verificationShare,
							peerShares,
						});
						return Promise.resolve("0x");
					},
				};
				const client = new FrostClient(a.address, coordinator);
				client.registerParticipants(participants);
				return client
			},
		);
		const groupId = keccak256(participantsRoot);
		log(
			"------------------------ Trigger Keygen Init ------------------------",
		);
		for (const c of clients) {
			log(`>>>> Keygen init to ${c.validator()} >>>>`);
			await c.handleKeygenInit(groupId, participantsRoot, count, threshold);
		}
		log(
			"------------------------ Publish Commitments ------------------------",
		);
		for (const c of clients) {
			for (const e of commitmentEvents) {
				log(
					`>>>> Keygen commitment from ${e.index} to ${c.participationIndex(e.groupId)} >>>>`,
				);
				c.handleKeygenCommitment(e.groupId, e.index, e.commits, e.pok);
			}
		}
		log(
			"------------------------ Publish Shares ------------------------",
		);
		for (const c of clients) {
			for (const e of shareEvents) {
				log(
					`>>>> Keygen secrets from ${e.index} to ${c.participationIndex(e.groupId)} >>>>`,
				);
				c.handleKeygenSecrets(e.groupId, e.index, e.peerShares);
			}
		}
	});
});
