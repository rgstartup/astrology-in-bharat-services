import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/core/redis/redis.service';
import {
  PRESENCE_KEYS,
  PRESENCE_PUBSUB_CHANNEL,
  PRESENCE_TTL,
} from './presence.constants';
import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
} from '@/core/enums';
import {
  type PresenceChangedEventPayload,
  type PresenceRedisClient,
} from './presence.types';
import { registerPresenceScripts } from './utils/register-presence-scripts.util';

@Injectable()
export class PresenceRedisRepository {
  private readonly logger = new Logger(PresenceRedisRepository.name);
  private readonly commands: PresenceRedisClient;

  constructor(private readonly redis: RedisService) {
    this.commands = registerPresenceScripts(redis.getClient());
  }

  async registerConnection(
    expertId: number,
    connectionId: string,
    ttlSeconds = PRESENCE_TTL,
  ): Promise<{ wasOnline: boolean; activeConnections: number }> {
    try {
      const connSetKey = PRESENCE_KEYS.expertConnections(expertId);
      const connKey = PRESENCE_KEYS.connection(connectionId);
      const now = Date.now().toString();

      const [wasOnlineNum, activeConnections] =
        await this.commands.presenceRegisterConnection(
          connSetKey,
          connKey,
          expertId.toString(),
          connectionId,
          ttlSeconds.toString(),
          now,
        );

      return {
        wasOnline: wasOnlineNum === 1,
        activeConnections: Number(activeConnections),
      };
    } catch (err) {
      this.logger.error(
        `Failed to register connection in Redis for expert ${expertId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      return { wasOnline: false, activeConnections: 1 };
    }
  }

  async refreshHeartbeat(
    expertId: number,
    connectionId: string,
    ttlSeconds = PRESENCE_TTL,
  ): Promise<boolean> {
    try {
      const connSetKey = PRESENCE_KEYS.expertConnections(expertId);
      const connKey = PRESENCE_KEYS.connection(connectionId);
      const now = Date.now().toString();

      const result = await this.commands.presenceHeartbeat(
        connSetKey,
        connKey,
        expertId.toString(),
        connectionId,
        ttlSeconds.toString(),
        now,
      );
      return result === 1 || result === 2;
    } catch (err) {
      this.logger.error(
        `Failed to refresh heartbeat for expert ${expertId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  async removeConnection(
    expertId: number,
    connectionId: string,
  ): Promise<{ remainingConnections: number }> {
    try {
      const connSetKey = PRESENCE_KEYS.expertConnections(expertId);
      const connKey = PRESENCE_KEYS.connection(connectionId);

      const remaining = await this.commands.presenceDisconnect(
        connSetKey,
        connKey,
        expertId.toString(),
        connectionId,
      );

      return { remainingConnections: Number(remaining) };
    } catch (err) {
      this.logger.error(
        `Failed to remove connection for expert ${expertId}: ${(err as Error).message}`,
      );
      return { remainingConnections: 0 };
    }
  }

  async getRealtimePresence(expertId: number): Promise<RealtimePresence> {
    try {
      const connSetKey = PRESENCE_KEYS.expertConnections(expertId);
      const activeCount = await this.commands.presenceGetRealtime(connSetKey);
      return Number(activeCount) > 0
        ? RealtimePresence.ONLINE
        : RealtimePresence.OFFLINE;
    } catch (err) {
      this.logger.error(
        `Failed to get realtime presence for expert ${expertId}: ${(err as Error).message}`,
      );
      return RealtimePresence.OFFLINE;
    }
  }

  async getBatchRealtimePresence(
    expertIds: number[],
  ): Promise<Map<number, RealtimePresence>> {
    const result = new Map<number, RealtimePresence>();
    if (expertIds.length === 0) return result;

    try {
      const keys = expertIds.map((id) => PRESENCE_KEYS.expertConnections(id));
      const counts: number[] = await this.commands.presenceBatchRealtime(
        keys.length,
        ...keys,
      );

      for (let i = 0; i < expertIds.length; i++) {
        const id = expertIds[i]!;
        const count = counts[i] || 0;
        result.set(
          id,
          count > 0 ? RealtimePresence.ONLINE : RealtimePresence.OFFLINE,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to batch get realtime presence: ${(err as Error).message}`,
      );
      for (const id of expertIds) {
        result.set(id, RealtimePresence.OFFLINE);
      }
    }
    return result;
  }

  async setConsultationState(
    expertId: number,
    state: ConsultationState,
    consultationId?: string | number,
  ): Promise<void> {
    try {
      const key = PRESENCE_KEYS.expertConsultation(expertId);
      if (state === ConsultationState.BUSY) {
        const payload = JSON.stringify({
          state: ConsultationState.BUSY,
          consultationId: consultationId ? String(consultationId) : null,
          updatedAt: Date.now(),
        });
        await this.redis.set(key, payload);
      } else {
        await this.redis.del(key);
      }
    } catch (err) {
      this.logger.error(
        `Failed to set consultation state in Redis for expert ${expertId}: ${(err as Error).message}`,
      );
    }
  }

  async getConsultationState(expertId: number): Promise<ConsultationState> {
    try {
      const key = PRESENCE_KEYS.expertConsultation(expertId);
      const val = await this.redis.get(key);
      if (!val) return ConsultationState.IDLE;
      const parsed = JSON.parse(val);
      return parsed.state === ConsultationState.BUSY
        ? ConsultationState.BUSY
        : ConsultationState.IDLE;
    } catch (err) {
      this.logger.error(
        `Failed to get consultation state for expert ${expertId}: ${(err as Error).message}`,
      );
      return ConsultationState.IDLE;
    }
  }

  async getBatchConsultationStates(
    expertIds: number[],
  ): Promise<Map<number, ConsultationState>> {
    const result = new Map<number, ConsultationState>();
    if (expertIds.length === 0) return result;

    try {
      const keys = expertIds.map((id) => PRESENCE_KEYS.expertConsultation(id));
      const values = await this.redis.mget(keys);

      for (let i = 0; i < expertIds.length; i++) {
        const id = expertIds[i]!;
        const val = values[i];
        if (val) {
          try {
            const parsed = JSON.parse(val);
            result.set(
              id,
              parsed.state === ConsultationState.BUSY
                ? ConsultationState.BUSY
                : ConsultationState.IDLE,
            );
          } catch {
            result.set(id, ConsultationState.IDLE);
          }
        } else {
          result.set(id, ConsultationState.IDLE);
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to batch get consultation states: ${(err as Error).message}`,
      );
      for (const id of expertIds) {
        result.set(id, ConsultationState.IDLE);
      }
    }
    return result;
  }

  async setCachedAvailability(
    expertId: number,
    mode: AvailabilityMode,
  ): Promise<void> {
    try {
      const key = PRESENCE_KEYS.expertAvailability(expertId);
      await this.redis.set(key, mode);
    } catch (err) {
      this.logger.error(
        `Failed to cache availability mode for expert ${expertId}: ${(err as Error).message}`,
      );
    }
  }

  async getCachedAvailability(
    expertId: number,
  ): Promise<AvailabilityMode | null> {
    try {
      const key = PRESENCE_KEYS.expertAvailability(expertId);
      const val = await this.redis.get(key);
      if (
        val === AvailabilityMode.AVAILABLE ||
        val === AvailabilityMode.UNAVAILABLE
      ) {
        return val;
      }
      return null;
    } catch (err) {
      this.logger.error(
        `Failed to get cached availability for expert ${expertId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async getBatchCachedAvailability(
    expertIds: number[],
  ): Promise<Map<number, AvailabilityMode | null>> {
    const result = new Map<number, AvailabilityMode | null>();
    if (expertIds.length === 0) return result;

    try {
      const keys = expertIds.map((id) => PRESENCE_KEYS.expertAvailability(id));
      const values = await this.redis.mget(keys);

      for (let i = 0; i < expertIds.length; i++) {
        const id = expertIds[i]!;
        const val = values[i];
        if (
          val === AvailabilityMode.AVAILABLE ||
          val === AvailabilityMode.UNAVAILABLE
        ) {
          result.set(id, val);
        } else {
          result.set(id, null);
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to batch get cached availability: ${(err as Error).message}`,
      );
      for (const id of expertIds) {
        result.set(id, null);
      }
    }
    return result;
  }

  async getLastStatus(expertId: number): Promise<ExpertClientStatus | null> {
    try {
      const key = PRESENCE_KEYS.expertLastStatus(expertId);
      const val = await this.redis.get(key);
      if (
        val === ExpertClientStatus.ONLINE ||
        val === ExpertClientStatus.BUSY ||
        val === ExpertClientStatus.OFFLINE
      ) {
        return val;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setLastStatus(
    expertId: number,
    status: ExpertClientStatus,
  ): Promise<void> {
    try {
      const key = PRESENCE_KEYS.expertLastStatus(expertId);
      await this.redis.set(key, status);
    } catch (err) {
      this.logger.error(
        `Failed to set last status for expert ${expertId}: ${(err as Error).message}`,
      );
    }
  }

  async publishPresenceChanged(
    expertId: number,
    status: ExpertClientStatus,
  ): Promise<void> {
    try {
      const payload: PresenceChangedEventPayload = {
        expertId,
        status,
        timestamp: new Date().toISOString(),
      };
      await this.redis.publish(
        PRESENCE_PUBSUB_CHANNEL,
        JSON.stringify(payload),
      );
    } catch (err) {
      this.logger.error(
        `Failed to publish presence change event to Redis: ${(err as Error).message}`,
      );
    }
  }
}
