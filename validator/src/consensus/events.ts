import { Address, PublicClient } from "viem";
import { FrostClient } from "./client.js";
import { watchCoordinatorEvents } from "../service/watchers.js";
import { keyGenCommittedEventSchema, keyGenEventSchema, keyGenSecretSharedEventSchema } from "../types/schemas.js";
import { toPoint } from "../frost/math.js";

export const linkClientToCoordinator = (
    frostClient: FrostClient,
    publicClient: PublicClient,
    coordinatorAddress: Address,
) => {
    watchCoordinatorEvents({
        client: publicClient,
        target: coordinatorAddress,
        onKeyGenInit: async (e) => {
            const event = keyGenEventSchema.parse(e);
            return frostClient.handleKeygenInit(
                event.id,
                event.participants,
                event.count,
                event.threshold,
            );
        },
        onKeyGenCommitment: async (e) => {
            const event = keyGenCommittedEventSchema.parse(e);
            return frostClient.handleKeygenCommitment(
                event.id,
                event.index,
                event.commitment.c.map((c) => toPoint(c)),
                {
                    r: toPoint(event.commitment.r),
                    mu: event.commitment.mu,
                },
            );
        },
        onKeyGenSecrets: async (e) => {
            const event = keyGenSecretSharedEventSchema.parse(e);
            return frostClient.handleKeygenSecrets(
                event.id,
                event.index,
                event.share.f,
            );
        },
        onError: console.error,
    });
}