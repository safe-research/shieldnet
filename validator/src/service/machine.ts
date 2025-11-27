import type { Hex } from "viem";
import type { KeyGenClient } from "../consensus/keyGen/client.js";
import type {
	ProtocolAction,
	ShieldnetProtocol,
} from "../consensus/protocol/types.js";
import type { SigningClient } from "../consensus/signing/client.js";
import type { Participant } from "../consensus/storage/types.js";
import type { VerificationEngine } from "../consensus/verify/engine.js";
import type { GroupId, SignatureId } from "../frost/types.js";
import { handleEpochStaged } from "../machine/consensus/epochStaged.js";
import { checkEpochRollover } from "../machine/consensus/rollover.js";
import { handleTransactionAttested } from "../machine/consensus/transactionAttested.js";
import { handleTransactionProposed } from "../machine/consensus/transactionProposed.js";
import { checkKeyGenAbort } from "../machine/keygen/abort.js";
import { handleKeyGenCommitted } from "../machine/keygen/committed.js";
import { checkGenesis } from "../machine/keygen/genesis.js";
import { handleKeyGenSecretShared } from "../machine/keygen/secretShares.js";
import { checkKeyGenTimeouts } from "../machine/keygen/timeouts.js";
import { handleSigningCompleted } from "../machine/signing/completed.js";
import { handleRevealedNonces } from "../machine/signing/nonces.js";
import { handlePreprocess } from "../machine/signing/preprocess.js";
import { handleSigningShares } from "../machine/signing/shares.js";
import { handleSign } from "../machine/signing/sign.js";
import { checkSigningTimeouts } from "../machine/signing/timeouts.js";
import type {
	ConsensusState,
	MachineConfig,
	MachineStates,
	SigningState,
	StateDiff,
	StateTransition,
} from "../machine/types.js";
import { Queue } from "../utils/queue.js";

const BLOCKS_PER_EPOCH = (24n * 60n * 60n) / 5n; // ~ blocks for 1 day
const DEFAULT_TIMEOUT = (10n * 60n) / 5n; // ~ blocks for 10 minutes

export class ShieldnetStateMachine {
	// Injected logic
	#protocol: ShieldnetProtocol;
	#verificationEngine: VerificationEngine;
	#keyGenClient: KeyGenClient;
	#signingClient: SigningClient;
	#logger?: (msg: unknown) => void;
	// Config Parameters
	#machineConfig: MachineConfig;
	// Event queue state
	#lastProcessedBlock = 0n;
	#lastProcessedIndex = 0;
	#transitionQueue = new Queue<StateTransition>();
	#currentTransition?: StateTransition;
	// Consensus state
	#consensusState: ConsensusState = {
		epochGroups: new Map<bigint, GroupId>(),
		activeEpoch: 0n,
		stagedEpoch: 0n,
		groupPendingNonces: new Set<GroupId>(),
		messageSignatureRequests: new Map<Hex, SignatureId>(),
		transactionProposalInfo: new Map<
			Hex,
			{ epoch: bigint; transactionHash: Hex }
		>(),
	};
	// Sub machine state
	#machineStates: MachineStates = {
		rollover: { id: "waiting_for_rollover" },
		signing: new Map<SignatureId, SigningState>(),
	};

	constructor({
		participants,
		protocol,
		keyGenClient,
		signingClient,
		verificationEngine,
		initialEpoch,
		logger,
		blocksPerEpoch,
		keyGenTimeout,
		signingTimeout,
	}: {
		participants: Participant[];
		protocol: ShieldnetProtocol;
		keyGenClient: KeyGenClient;
		signingClient: SigningClient;
		verificationEngine: VerificationEngine;
		initialEpoch?: bigint;
		logger?: (msg: unknown) => void;
		blocksPerEpoch?: bigint;
		keyGenTimeout?: bigint;
		signingTimeout?: bigint;
	}) {
		this.#machineConfig = {
			defaultParticipants: participants,
			blocksPerEpoch: blocksPerEpoch ?? BLOCKS_PER_EPOCH,
			keyGenTimeout: keyGenTimeout ?? DEFAULT_TIMEOUT,
			signingTimeout: signingTimeout ?? DEFAULT_TIMEOUT,
		};
		this.#protocol = protocol;
		this.#keyGenClient = keyGenClient;
		this.#signingClient = signingClient;
		this.#verificationEngine = verificationEngine;
		this.#consensusState.activeEpoch = initialEpoch ?? 0n;
		this.#logger = logger;
	}

	transition(transition: StateTransition) {
		this.#logger?.(`Enqueue ${transition.type} at ${transition.block}`);
		this.#transitionQueue.push(transition);
		this.checkNextTransition();
	}

	private checkNextTransition() {
		// Still processing
		if (this.#currentTransition !== undefined) return;
		const transition = this.#transitionQueue.pop();
		// Nothing queued
		if (transition === undefined) return;
		this.#currentTransition = transition;
		this.performTransition(transition)
			.then((actions) => {
				for (const action of actions) {
					this.#protocol.process(action);
				}
			})
			.catch(this.#logger)
			.finally(() => {
				this.#currentTransition = undefined;
				this.checkNextTransition();
			});
	}

	private async performTransition(
		transition: StateTransition,
	): Promise<ProtocolAction[]> {
		switch (transition.type) {
			case "block":
				return this.progressToBlock(transition.block);
			case "event":
				return this.processBlockEvent(
					transition.block,
					transition.index,
					transition.eventName,
					transition.eventArgs,
				);
		}
	}

	private progressToBlock(block: bigint): ProtocolAction[] {
		// Check if we are already up to date
		if (block <= this.#lastProcessedBlock) {
			return [];
		}
		this.#lastProcessedBlock = block;
		const actions: ProtocolAction[] = [];

		actions.push(
			...this.applyDiff(
				checkKeyGenAbort(
					this.#machineConfig,
					this.#consensusState,
					this.#machineStates,
					block,
					this.#logger,
				),
			),
		);

		actions.push(
			...this.applyDiff(
				checkKeyGenTimeouts(
					this.#machineConfig,
					this.#protocol,
					this.#keyGenClient,
					this.#consensusState,
					this.#machineStates,
					block,
					this.#logger,
				),
			),
		);

		for (const diff of checkSigningTimeouts(
			this.#machineConfig,
			this.#signingClient,
			this.#consensusState,
			this.#machineStates,
			block,
		)) {
			actions.push(...this.applyDiff(diff));
		}

		actions.push(
			...this.applyDiff(
				checkGenesis(
					this.#machineConfig,
					this.#keyGenClient,
					this.#consensusState,
					this.#machineStates,
					this.#logger,
				),
			),
		);

		actions.push(
			...this.applyDiff(
				checkEpochRollover(
					this.#machineConfig,
					this.#protocol,
					this.#keyGenClient,
					this.#consensusState,
					this.#machineStates,
					block,
					this.#logger,
				),
			),
		);

		return actions;
	}

	private async processBlockEvent(
		block: bigint,
		index: number,
		eventName: string,
		eventArgs: unknown,
	): Promise<ProtocolAction[]> {
		if (
			block < this.#lastProcessedBlock ||
			(block === this.#lastProcessedBlock && index <= this.#lastProcessedIndex)
		) {
			throw Error(
				`Invalid block number (${block}) and index ${index} (currently at block ${this.#lastProcessedBlock} and index ${this.#lastProcessedIndex})`,
			);
		}
		const actions: ProtocolAction[] = [];
		this.#lastProcessedIndex = index;
		actions.push(...this.progressToBlock(block));
		actions.push(...(await this.handleEvent(block, eventName, eventArgs)));
		// Check after every event if we could do a epoch rollover
		actions.push(
			...this.applyDiff(
				checkEpochRollover(
					this.#machineConfig,
					this.#protocol,
					this.#keyGenClient,
					this.#consensusState,
					this.#machineStates,
					block,
					this.#logger,
				),
			),
		);
		return actions;
	}

	private applyDiff(
		diff: StateDiff,
		machineStates: MachineStates = this.#machineStates,
	): ProtocolAction[] {
		if (diff.signing !== undefined) {
			const [signatureId, state] = diff.signing;
			if (state === undefined) {
				machineStates.signing.delete(signatureId);
			} else {
				machineStates.signing.set(signatureId, state);
			}
		}
		if (diff.rollover !== undefined) {
			machineStates.rollover = diff.rollover;
		}
		return diff.actions ?? [];
	}
	private async handleEvent(
		block: bigint,
		eventName: string,
		eventArgs: unknown,
	): Promise<ProtocolAction[]> {
		this.#logger?.(`Handle event ${eventName}`);
		switch (eventName) {
			case "KeyGenCommitted": {
				const diff = await handleKeyGenCommitted(
					this.#machineConfig,
					this.#keyGenClient,
					this.#consensusState,
					this.#machineStates,
					block,
					eventArgs,
				);
				return this.applyDiff(diff);
			}
			case "KeyGenSecretShared": {
				const diff = await handleKeyGenSecretShared(
					this.#machineConfig,
					this.#protocol,
					this.#verificationEngine,
					this.#keyGenClient,
					this.#signingClient,
					this.#consensusState,
					this.#machineStates,
					eventArgs,
					this.#logger,
				);
				return this.applyDiff(diff);
			}
			case "Preprocess": {
				const diff = await handlePreprocess(
					this.#signingClient,
					this.#consensusState,
					eventArgs,
					this.#logger,
				);
				return this.applyDiff(diff);
			}
			case "Sign": {
				const diff = await handleSign(
					this.#machineConfig,
					this.#verificationEngine,
					this.#signingClient,
					this.#consensusState,
					this.#machineStates,
					block,
					eventArgs,
					this.#logger,
				);
				return this.applyDiff(diff);
			}
			case "SignRevealedNonces": {
				const diff = await handleRevealedNonces(
					this.#machineConfig,
					this.#signingClient,
					this.#consensusState,
					this.#machineStates,
					block,
					eventArgs,
					this.#logger,
				);
				return this.applyDiff(diff);
			}
			case "SignShared": {
				const diff = await handleSigningShares(this.#machineStates, eventArgs);
				return this.applyDiff(diff);
			}
			case "SignCompleted": {
				const diff = await handleSigningCompleted(
					this.#machineConfig,
					this.#machineStates,
					block,
					eventArgs,
				);
				return this.applyDiff(diff);
			}
			case "EpochStaged": {
				const diff = await handleEpochStaged(
					this.#consensusState,
					this.#machineStates,
					eventArgs,
				);
				return this.applyDiff(diff);
			}
			case "TransactionProposed": {
				const diff = await handleTransactionProposed(
					this.#protocol,
					this.#verificationEngine,
					this.#consensusState,
					eventArgs,
					this.#logger,
				);
				return this.applyDiff(diff);
			}
			case "TransactionAttested": {
				const diff = await handleTransactionAttested(
					this.#machineStates,
					this.#consensusState,
					eventArgs,
				);
				return this.applyDiff(diff);
			}
			default: {
				return [];
			}
		}
	}
}
