import type { Redis } from 'ioredis';

// Single source of truth for presence/availability string values lives in
// `@/core/enums` as string enums (value + type in one declaration). They are
// imported here for the interfaces below and re-exported so existing
// `presence.types` import sites keep working.
import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
} from '@/core/enums';

export {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
};

export interface PresenceChangedEventPayload {
  expertId: number;
  status: ExpertClientStatus;
  timestamp: string;
  /** ISO instant the expert was last seen; set on offline transitions. */
  lastSeenAt?: string | null;
}

export interface ExpertFullStatus {
  expertId: number;
  realtimePresence: RealtimePresence;
  availabilityMode: AvailabilityMode;
  consultationState: ConsultationState;
  status: ExpertClientStatus;
  isAvailableForConsultation: boolean;
  activeConnections: number;
  /** ISO instant from `expertAccounts.last_seen_at`; null when never seen. */
  lastSeenAt: string | null;
}

/**
 * Custom Lua commands registered via ioredis `defineCommand`.
 * ioredis then uses EVALSHA internally (falls back to EVAL on NOSCRIPT).
 */
export interface PresenceRedisCommands {
  presenceRegisterConnection(
    connSetKey: string,
    connKey: string,
    expertId: string,
    connectionId: string,
    ttlSeconds: string,
    now: string,
  ): Promise<[number, number]>;
  presenceHeartbeat(
    connSetKey: string,
    connKey: string,
    expertId: string,
    connectionId: string,
    ttlSeconds: string,
    now: string,
  ): Promise<number>;
  presenceDisconnect(
    connSetKey: string,
    connKey: string,
    expertId: string,
    connectionId: string,
  ): Promise<number>;
  presenceGetRealtime(connSetKey: string): Promise<number>;
  presenceBatchRealtime(
    numKeys: number,
    ...connSetKeys: string[]
  ): Promise<number[]>;
}

/** ioredis client with presence Lua commands registered. */
export type PresenceRedisClient = Redis & PresenceRedisCommands;
