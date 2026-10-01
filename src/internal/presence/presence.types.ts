import type { Redis } from 'ioredis';

export type RealtimePresence = 'online' | 'offline';

export type AvailabilityMode = 'available' | 'unavailable';

export type ConsultationState = 'idle' | 'busy';

export type ExpertClientStatus = 'online' | 'busy' | 'offline';

export interface PresenceChangedEventPayload {
  expertId: number;
  status: ExpertClientStatus;
  timestamp: string;
}

export interface ExpertFullStatus {
  expertId: number;
  realtimePresence: RealtimePresence;
  availabilityMode: AvailabilityMode;
  consultationState: ConsultationState;
  status: ExpertClientStatus;
  isAvailableForConsultation: boolean;
  activeConnections: number;
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
