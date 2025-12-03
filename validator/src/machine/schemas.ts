import { z } from "zod";
import { epochRolloverPacketSchema } from "../consensus/verify/rollover/schemas.js";
import { safeTransactionPacketSchema } from "../consensus/verify/safeTx/schemas.js";
import type { GroupId, ParticipantId, SignatureId } from "../frost/types.js";
import { hexDataSchema } from "../types/schemas.js";

// --- Base Type Definitions (for Zod) ---

// Assuming Hex, GroupId, ParticipantId, SignatureId, SafeTransactionPacket, EpochRolloverPacket
// are all represented as strings (Hex) or standard identifiers in the database.

const groupIdSchema = hexDataSchema.transform((v) => v as GroupId);
const participantIdSchema = z.coerce
	.bigint()
	.nonnegative()
	.transform((v) => v as ParticipantId);
const signatureIdSchema = hexDataSchema.transform((v) => v as SignatureId);
const coercedBigIntSchema = z.coerce.bigint().nonnegative();

const packetSchema = z.union([safeTransactionPacketSchema, epochRolloverPacketSchema]);

// --- 1. RolloverState Schemas ---

const waitingForRolloverSchema = z.object({
	id: z.literal("waiting_for_rollover"),
});

const collectingCommitmentsSchema = z.object({
	id: z.literal("collecting_commitments"),
	groupId: groupIdSchema,
	nextEpoch: coercedBigIntSchema,
	deadline: coercedBigIntSchema,
});

const collectingSharesSchema = z.object({
	id: z.literal("collecting_shares"),
	groupId: groupIdSchema,
	nextEpoch: coercedBigIntSchema,
	deadline: coercedBigIntSchema,
	lastParticipant: participantIdSchema.optional(),
});

const signRolloverSchema = z.object({
	id: z.literal("sign_rollover"),
	groupId: groupIdSchema,
	nextEpoch: coercedBigIntSchema,
	message: hexDataSchema,
	responsible: participantIdSchema,
});

export const rolloverStateSchema = z.union([
	waitingForRolloverSchema,
	collectingCommitmentsSchema,
	collectingSharesSchema,
	signRolloverSchema,
]);

// --- 2. SigningState Schemas ---

const baseSigningStateSchema = z.object({
	packet: packetSchema,
});

const waitingForRequestSchema = z.object({
	id: z.literal("waiting_for_request"),
	responsible: participantIdSchema.optional(),
	signers: z.array(participantIdSchema),
	deadline: coercedBigIntSchema,
});

const collectNonceCommitmentsSchema = z.object({
	id: z.literal("collect_nonce_commitments"),
	signatureId: signatureIdSchema,
	lastSigner: participantIdSchema.optional(),
	deadline: coercedBigIntSchema,
});

const collectSigningSharesSchema = z.object({
	id: z.literal("collect_signing_shares"),
	signatureId: signatureIdSchema,
	sharesFrom: z.array(participantIdSchema),
	lastSigner: participantIdSchema.optional(),
	deadline: coercedBigIntSchema,
});

const waitingForAttestationSchema = z.object({
	id: z.literal("waiting_for_attestation"),
	signatureId: signatureIdSchema,
	responsible: participantIdSchema.optional(),
	deadline: coercedBigIntSchema,
});

export const signingStateSchema = z.intersection(
	baseSigningStateSchema,
	z.union([
		waitingForRequestSchema,
		collectNonceCommitmentsSchema,
		collectSigningSharesSchema,
		waitingForAttestationSchema,
	]),
);

// --- 3. MutableConsensusState Schema ---

const groupInfoSchema = z.object({
	groupId: groupIdSchema,
	participantId: participantIdSchema,
});

export const consensusStateSchema = z.object({
	genesisGroupId: groupIdSchema.optional(),
	activeEpoch: coercedBigIntSchema,
	stagedEpoch: coercedBigIntSchema,
	groupPendingNonces: z.record(groupIdSchema, z.boolean()),
	epochGroups: z.record(z.string(), groupInfoSchema),
	signatureIdToMessage: z.record(signatureIdSchema, hexDataSchema),
});
