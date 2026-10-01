import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { inArray, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts } from '@/core/drizzledb/schema';
import { RedisService } from '@/core/redis/redis.service';
import {
  PRESENCE_EVENT_NAME,
  PRESENCE_PUBSUB_CHANNEL,
} from './presence.constants';
import { PresenceRedisRepository } from './presence-redis.repository';
import {
  AvailabilityMode,
  ExpertClientStatus,
  ExpertFullStatus,
  PresenceChangedEventPayload,
} from './presence.types';
import {
  deriveExpertClientStatus,
  isAvailableForConsultation,
} from './utils/presence.utils';

@Injectable()
export class PresenceService implements OnModuleInit {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly redis: RedisService,
    private readonly redisRepo: PresenceRedisRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    try {
      await this.redis.subscribe(PRESENCE_PUBSUB_CHANNEL, (message: string) => {
        try {
          const payload: PresenceChangedEventPayload = JSON.parse(message);
          this.eventEmitter.emit(PRESENCE_EVENT_NAME, payload);
        } catch (e) {
          this.logger.error(
            `Failed to parse presence event message: ${message}`,
            (e as Error).stack,
          );
        }
      });
    } catch (err) {
      this.logger.warn(
        `Failed to subscribe to Redis presence Pub/Sub channel: ${(err as Error).message}`,
      );
    }
  }

  async connect(expertId: number, connectionId: string): Promise<void> {
    const { activeConnections } = await this.redisRepo.registerConnection(
      expertId,
      connectionId,
    );
    this.logger.log(
      `[Presence] Expert ${expertId} connected (conn: ${connectionId}, total active: ${activeConnections})`,
    );

    await this.evaluateAndPublishStatusChange(expertId);
  }

  async heartbeat(expertId: number, connectionId: string): Promise<void> {
    await this.redisRepo.refreshHeartbeat(expertId, connectionId);
  }

  async disconnect(expertId: number, connectionId: string): Promise<void> {
    const { remainingConnections } = await this.redisRepo.removeConnection(
      expertId,
      connectionId,
    );
    this.logger.log(
      `[Presence] Expert ${expertId} disconnected (conn: ${connectionId}, remaining: ${remainingConnections})`,
    );

    await this.evaluateAndPublishStatusChange(expertId);
  }

  async getStatus(expertId: number): Promise<ExpertClientStatus> {
    const [realtime, availability, consultation] = await Promise.all([
      this.redisRepo.getRealtimePresence(expertId),
      this.getAvailabilityMode(expertId),
      this.redisRepo.getConsultationState(expertId),
    ]);

    return deriveExpertClientStatus(realtime, availability, consultation);
  }

  async getFullStatus(expertId: number): Promise<ExpertFullStatus> {
    const [realtime, availability, consultation] = await Promise.all([
      this.redisRepo.getRealtimePresence(expertId),
      this.getAvailabilityMode(expertId),
      this.redisRepo.getConsultationState(expertId),
    ]);

    const status = deriveExpertClientStatus(
      realtime,
      availability,
      consultation,
    );
    const availableForConsultation = isAvailableForConsultation(
      realtime,
      availability,
      consultation,
    );

    return {
      expertId,
      realtimePresence: realtime,
      availabilityMode: availability,
      consultationState: consultation,
      status,
      isAvailableForConsultation: availableForConsultation,
      activeConnections: realtime === 'online' ? 1 : 0,
    };
  }

  async getStatuses(
    expertIds: number[],
  ): Promise<Map<number, ExpertClientStatus>> {
    const result = new Map<number, ExpertClientStatus>();
    if (expertIds.length === 0) return result;

    const [realtimeMap, cachedAvailabilityMap, consultationMap] =
      await Promise.all([
        this.redisRepo.getBatchRealtimePresence(expertIds),
        this.redisRepo.getBatchCachedAvailability(expertIds),
        this.redisRepo.getBatchConsultationStates(expertIds),
      ]);

    // Check which experts need DB lookup for availability mode
    const missingAvailabilityIds: number[] = [];
    for (const id of expertIds) {
      if (!cachedAvailabilityMap.get(id)) {
        missingAvailabilityIds.push(id);
      }
    }

    if (missingAvailabilityIds.length > 0) {
      try {
        const rows = await this.db
          .select({
            id: expertAccounts.id,
            availability_mode: expertAccounts.availability_mode,
            is_available: expertAccounts.is_available,
          })
          .from(expertAccounts)
          .where(inArray(expertAccounts.id, missingAvailabilityIds));

        for (const row of rows) {
          const mode: AvailabilityMode =
            row.availability_mode === 'unavailable'
              ? 'unavailable'
              : row.availability_mode === 'available'
                ? 'available'
                : row.is_available
                  ? 'available'
                  : 'available'; // Default to available preference

          cachedAvailabilityMap.set(row.id, mode);
          void this.redisRepo.setCachedAvailability(row.id, mode);
        }
      } catch (err) {
        this.logger.error(
          `Failed to batch load expert availability from DB: ${(err as Error).message}`,
        );
      }
    }

    for (const id of expertIds) {
      const realtime = realtimeMap.get(id) || 'offline';
      const availability = cachedAvailabilityMap.get(id) || 'available';
      const consultation = consultationMap.get(id) || 'idle';
      const status = deriveExpertClientStatus(
        realtime,
        availability,
        consultation,
      );
      result.set(id, status);
    }

    return result;
  }

  async setAvailability(
    expertId: number,
    mode: AvailabilityMode,
  ): Promise<void> {
    const isAvailableBool = mode === 'available';

    // 1. Update persistent PostgreSQL record
    await this.db
      .update(expertAccounts)
      .set({
        availability_mode: mode,
        is_available: isAvailableBool,
        updated_at: new Date(),
      })
      .where(eq(expertAccounts.id, expertId));

    // 2. Update Redis cache
    await this.redisRepo.setCachedAvailability(expertId, mode);

    this.logger.log(
      `[Availability] Expert ${expertId} updated availability mode to ${mode}`,
    );

    // 3. Recalculate status and emit event if changed
    await this.evaluateAndPublishStatusChange(expertId);
  }

  async setBusy(
    expertId: number,
    consultationId?: string | number,
  ): Promise<void> {
    await this.redisRepo.setConsultationState(expertId, 'busy', consultationId);
    this.logger.log(
      `[Consultation] Expert ${expertId} marked busy (consultation: ${consultationId ?? 'active'})`,
    );
    await this.evaluateAndPublishStatusChange(expertId);
  }

  async setIdle(
    expertId: number,
    consultationId?: string | number,
  ): Promise<void> {
    await this.redisRepo.setConsultationState(expertId, 'idle');
    this.logger.log(
      `[Consultation] Expert ${expertId} marked idle (consultation: ${consultationId ?? 'ended'})`,
    );
    await this.evaluateAndPublishStatusChange(expertId);
  }

  private async getAvailabilityMode(
    expertId: number,
  ): Promise<AvailabilityMode> {
    const cached = await this.redisRepo.getCachedAvailability(expertId);
    if (cached) return cached;

    try {
      const [account] = await this.db
        .select({
          id: expertAccounts.id,
          availability_mode: expertAccounts.availability_mode,
          is_available: expertAccounts.is_available,
        })
        .from(expertAccounts)
        .where(eq(expertAccounts.id, expertId))
        .limit(1);

      if (account) {
        const mode: AvailabilityMode =
          account.availability_mode === 'unavailable'
            ? 'unavailable'
            : account.availability_mode === 'available'
              ? 'available'
              : account.is_available
                ? 'available'
                : 'available';
        await this.redisRepo.setCachedAvailability(expertId, mode);
        return mode;
      }
    } catch (err) {
      this.logger.error(
        `Failed to get availability mode from DB for expert ${expertId}: ${(err as Error).message}`,
      );
    }

    return 'available';
  }

  private async evaluateAndPublishStatusChange(
    expertId: number,
  ): Promise<void> {
    const newStatus = await this.getStatus(expertId);
    const lastStatus = await this.redisRepo.getLastStatus(expertId);

    if (newStatus !== lastStatus) {
      await this.redisRepo.setLastStatus(expertId, newStatus);
      await this.redisRepo.publishPresenceChanged(expertId, newStatus);
      this.logger.log(
        `[Presence] 📢 Expert ${expertId} status transitioned: ${lastStatus ?? 'none'} -> ${newStatus}`,
      );
    }
  }
}
