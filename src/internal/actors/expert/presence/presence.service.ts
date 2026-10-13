import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, gt, inArray, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations, expertAccounts } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { RedisService } from '@/core/redis/redis.service';
import {
  PRESENCE_EVENT_NAME,
  PRESENCE_PUBSUB_CHANNEL,
} from './presence.constants';
import { PresenceRedisRepository } from './presence-redis.repository';
import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
} from '@/core/enums';
import {
  type ExpertFullStatus,
  type PresenceChangedEventPayload,
} from './presence.types';
import {
  deriveExpertClientStatus,
  isAvailableForConsultation,
} from './utils/presence.utils';

/** Consultation rows that can never go live again: a BUSY marker naming one is stale. */
const TERMINAL_CONSULTATION_STATUSES = [
  ConsultationStatus.COMPLETED,
  ConsultationStatus.CANCELLED,
  ConsultationStatus.REJECTED,
  ConsultationStatus.MISSED,
  ConsultationStatus.EXPIRED,
];

/** Boot-sweep lookback: markers older than the 15min TTL are dead anyway. */
const SWEEP_LOOKBACK_MS = 60 * 60 * 1000;
/** Boot-sweep cap: bounded work at startup; TTL bounds the rest. */
const SWEEP_LIMIT = 500;

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
    await this.sweepStaleBusyMarkers();
  }

  /**
   * Boot sweep: release BUSY markers whose consultation ended terminally
   * while this instance was down. DB-driven (recently-terminal rows mapped
   * to experts, marker compared before DEL) so no Redis key enumeration is
   * needed. Best-effort: repair-on-read and the 15min TTL cover the rest.
   */
  private async sweepStaleBusyMarkers(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - SWEEP_LOOKBACK_MS);
      const rows = await this.db
        .select({ id: consultations.id, expertId: consultations.expert_id })
        .from(consultations)
        .where(
          and(
            inArray(consultations.status, [...TERMINAL_CONSULTATION_STATUSES]),
            gt(consultations.updated_at, cutoff),
          ),
        )
        .limit(SWEEP_LIMIT);
      let repaired = 0;
      for (const row of rows) {
        try {
          const marker = await this.redisRepo.getConsultationMarker(row.expertId);
          if (
            marker?.state === ConsultationState.BUSY &&
            marker.consultationId === String(row.id)
          ) {
            await this.setIdle(row.expertId, row.id);
            repaired += 1;
          }
        } catch {
          continue;
        }
      }
      this.logger.log(
        `[Presence] Boot sweep: checked ${rows.length} terminal consultations, repaired ${repaired} stale busy markers`,
      );
    } catch (err) {
      this.logger.warn(
        `Presence boot sweep failed (repair-on-read still applies): ${(err as Error).message}`,
      );
    }
  }

  async connect(expertId: number, connectionId: string): Promise<void> {
    const { wasOnline, activeConnections } =
      await this.redisRepo.registerConnection(expertId, connectionId);
    this.logger.log(
      `[Presence] Expert ${expertId} connected (conn: ${connectionId}, total active: ${activeConnections})`,
    );

    // Force-republish when coming from fully offline: `last_status`
    // outlives connection-key expiry, so without this the reconnect
    // broadcast is suppressed and subscribed clients stay stale-offline.
    await this.evaluateAndPublishStatusChange(expertId, !wasOnline);
  }

  async heartbeat(expertId: number, connectionId: string): Promise<void> {
    const { ok, revived } = await this.redisRepo.refreshHeartbeat(
      expertId,
      connectionId,
    );
    // Sustain the BUSY marker while the expert is live: repair it when the
    // holding consultation is terminal, else refresh its 15min TTL.
    await this.sustainBusyMarker(expertId);
    // A heartbeat that revives an expired connection is an
    // offline->online transition: steady heartbeats stay silent.
    if (ok && revived) {
      await this.evaluateAndPublishStatusChange(expertId, true);
    }
  }

  async disconnect(expertId: number, connectionId: string): Promise<void> {
    const { remainingConnections } = await this.redisRepo.removeConnection(
      expertId,
      connectionId,
    );
    this.logger.log(
      `[Presence] Expert ${expertId} disconnected (conn: ${connectionId}, remaining: ${remainingConnections})`,
    );

    if (remainingConnections === 0) {
      await this.markLastSeen(expertId);
    }

    await this.evaluateAndPublishStatusChange(expertId);
  }

  /** Persists last-seen on final disconnect; never throws. */
  private async markLastSeen(expertId: number): Promise<void> {
    try {
      await this.db
        .update(expertAccounts)
        .set({ last_seen_at: new Date(), updated_at: new Date() })
        .where(eq(expertAccounts.id, expertId));
    } catch (err) {
      this.logger.error(
        `Failed to mark last_seen_at for expert ${expertId}: ${(err as Error).message}`,
      );
    }
  }

  async getStatus(expertId: number): Promise<ExpertClientStatus> {
    await this.repairStaleBusyMarker(expertId);
    const [realtime, availability, consultation] = await Promise.all([
      this.redisRepo.getRealtimePresence(expertId),
      this.getAvailabilityMode(expertId),
      this.redisRepo.getConsultationState(expertId),
    ]);

    return deriveExpertClientStatus(realtime, availability, consultation);
  }

  async getFullStatus(expertId: number): Promise<ExpertFullStatus> {
    await this.repairStaleBusyMarker(expertId);
    const [realtime, account, consultation] = await Promise.all([
      this.redisRepo.getRealtimePresence(expertId),
      this.loadAccountState(expertId),
      this.redisRepo.getConsultationState(expertId),
    ]);

    const status = deriveExpertClientStatus(
      realtime,
      account.mode,
      consultation,
    );
    const availableForConsultation = isAvailableForConsultation(
      realtime,
      account.mode,
      consultation,
    );

    return {
      expertId,
      realtimePresence: realtime,
      availabilityMode: account.mode,
      consultationState: consultation,
      status,
      isAvailableForConsultation: availableForConsultation,
      activeConnections: realtime === RealtimePresence.ONLINE ? 1 : 0,
      lastSeenAt: account.lastSeenAt,
    };
  }

  async getStatuses(
    expertIds: number[],
  ): Promise<Map<number, ExpertClientStatus>> {
    const result = new Map<number, ExpertClientStatus>();
    if (expertIds.length === 0) return result;

    const [realtimeMap, consultationMap, availabilityMap] = await Promise.all([
      this.redisRepo.getBatchRealtimePresence(expertIds),
      this.redisRepo.getBatchConsultationStates(expertIds),
      this.loadAvailabilityMap(expertIds),
    ]);

    for (const id of expertIds) {
      const realtime = realtimeMap.get(id) || RealtimePresence.OFFLINE;
      const availability =
        availabilityMap.get(id) || AvailabilityMode.AVAILABLE;
      const consultation =
        consultationMap.get(id) || ConsultationState.IDLE;
      const status = deriveExpertClientStatus(
        realtime,
        availability,
        consultation,
      );
      result.set(id, status);
    }

    return result;
  }

  /** Single batched PG read for availability; missing rows default downstream. */
  private async loadAvailabilityMap(
    expertIds: number[],
  ): Promise<Map<number, AvailabilityMode>> {
    const map = new Map<number, AvailabilityMode>();
    try {
      const rows = await this.db
        .select({
          id: expertAccounts.id,
          availability_mode: expertAccounts.availability_mode,
        })
        .from(expertAccounts)
        .where(inArray(expertAccounts.id, expertIds));

      for (const row of rows) {
        map.set(row.id, toAvailabilityMode(row.availability_mode));
      }
    } catch (err) {
      this.logger.error(
        `Failed to batch load expert availability from DB: ${(err as Error).message}`,
      );
    }
    return map;
  }

  async setAvailability(
    expertId: number,
    mode: AvailabilityMode,
  ): Promise<void> {
    const isAvailableBool = mode === AvailabilityMode.AVAILABLE;

    // 1. Update persistent PostgreSQL record
    await this.db
      .update(expertAccounts)
      .set({
        availability_mode: mode,
        is_available: isAvailableBool,
        updated_at: new Date(),
      })
      .where(eq(expertAccounts.id, expertId));

    this.logger.log(
      `[Availability] Expert ${expertId} updated availability mode to ${mode}`,
    );

    // 2. Recalculate status and emit event if changed
    await this.evaluateAndPublishStatusChange(expertId);
  }

  async setBusy(
    expertId: number,
    consultationId?: string | number,
  ): Promise<void> {
    await this.redisRepo.setConsultationState(expertId, ConsultationState.BUSY, consultationId);
    this.logger.log(
      `[Consultation] Expert ${expertId} marked busy (consultation: ${consultationId ?? 'active'})`,
    );
    await this.evaluateAndPublishStatusChange(expertId);
  }

  async setIdle(
    expertId: number,
    consultationId?: string | number,
  ): Promise<void> {
    await this.redisRepo.setConsultationState(expertId, ConsultationState.IDLE);
    this.logger.log(
      `[Consultation] Expert ${expertId} marked idle (consultation: ${consultationId ?? 'ended'})`,
    );
    await this.evaluateAndPublishStatusChange(expertId);
  }

  private async getAvailabilityMode(
    expertId: number,
  ): Promise<AvailabilityMode> {
    return (await this.loadAccountState(expertId)).mode;
  }

  /** PG-direct account state (mode + last-seen); defaults when missing. */
  private async loadAccountState(
    expertId: number,
  ): Promise<{ mode: AvailabilityMode; lastSeenAt: string | null }> {
    try {
      const [account] = await this.db
        .select({
          id: expertAccounts.id,
          availability_mode: expertAccounts.availability_mode,
          last_seen_at: expertAccounts.last_seen_at,
        })
        .from(expertAccounts)
        .where(eq(expertAccounts.id, expertId))
        .limit(1);

      if (account) {
        return {
          mode: toAvailabilityMode(account.availability_mode),
          lastSeenAt: account.last_seen_at
            ? account.last_seen_at.toISOString()
            : null,
        };
      }
    } catch (err) {
      this.logger.error(
        `Failed to get availability mode from DB for expert ${expertId}: ${(err as Error).message}`,
      );
    }

    return { mode: AvailabilityMode.AVAILABLE, lastSeenAt: null };
  }

  /**
   * Repair-on-read: a BUSY marker naming a missing, foreign, or terminal
   * consultation is released before the status is derived, so every status
   * evaluation self-heals crash orphans (bug-070 class). Never throws and
   * never refreshes the TTL (reads must not slide expiry). Fail-closed: a
   * DB error keeps the marker.
   */
  private async repairStaleBusyMarker(expertId: number): Promise<boolean> {
    try {
      const marker = await this.redisRepo.getConsultationMarker(expertId);
      if (
        !marker ||
        marker.state !== ConsultationState.BUSY ||
        !marker.consultationId
      ) {
        return false;
      }
      if (!(await this.isBusyMarkerStale(marker.consultationId, expertId))) {
        return false;
      }
      await this.setIdle(expertId, marker.consultationId);
      this.logger.warn(
        `[Presence] repair_stale_busy expert=${expertId} consultation=${marker.consultationId}`,
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `Busy-marker repair failed for expert ${expertId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Heartbeat sustain: repair a stale BUSY marker, else refresh its TTL so
   * the 15min bound only fires after a real crash, never mid-consultation.
   */
  private async sustainBusyMarker(expertId: number): Promise<void> {
    try {
      if (await this.repairStaleBusyMarker(expertId)) return;
      const marker = await this.redisRepo.getConsultationMarker(expertId);
      if (marker?.state === ConsultationState.BUSY) {
        await this.redisRepo.refreshConsultationMarker(expertId);
      }
    } catch (err) {
      this.logger.warn(
        `Busy-marker sustain failed for expert ${expertId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * True when the holding consultation is gone, belongs to another expert,
   * or can never go live again. False (keep BUSY) on any DB error.
   */
  private async isBusyMarkerStale(
    consultationId: string,
    expertId: number,
  ): Promise<boolean> {
    const id = Number(consultationId);
    if (!Number.isInteger(id)) return false;
    try {
      const [row] = await this.db
        .select({
          id: consultations.id,
          expertId: consultations.expert_id,
          status: consultations.status,
        })
        .from(consultations)
        .where(eq(consultations.id, id))
        .limit(1);
      if (!row || row.expertId !== expertId) return true;
      return (TERMINAL_CONSULTATION_STATUSES as string[]).includes(row.status);
    } catch (err) {
      this.logger.warn(
        `Busy-marker staleness check failed for consultation ${consultationId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  private async evaluateAndPublishStatusChange(
    expertId: number,
    forcePublishIfOnline = false,
  ): Promise<void> {
    const newStatus = await this.getStatus(expertId);
    const lastStatus = await this.redisRepo.getLastStatus(expertId);

    // `forcePublishIfOnline` covers transitions the `last_status` compare
    // cannot see: it survives connection-key expiry, so a reconnect or a
    // heartbeat-revival after expiry would otherwise publish nothing even
    // though realtime just flipped offline->online.
    const shouldPublish =
      newStatus !== lastStatus ||
      (forcePublishIfOnline && newStatus !== ExpertClientStatus.OFFLINE);

    if (shouldPublish) {
      await this.redisRepo.setLastStatus(expertId, newStatus);
      const lastSeenAt =
        newStatus === ExpertClientStatus.OFFLINE
          ? new Date().toISOString()
          : null;
      await this.redisRepo.publishPresenceChanged(
        expertId,
        newStatus,
        lastSeenAt,
      );
      this.logger.log(
        `[Presence] 📢 Expert ${expertId} status transitioned: ${lastStatus ?? 'none'} -> ${newStatus}`,
      );
    }
  }
}

/**
 * Normalizes the persistent availability preference.
 * Legacy `is_available` only ever resolved to AVAILABLE, so an unknown
 * `availability_mode` defaults to AVAILABLE to preserve behavior.
 */
function toAvailabilityMode(
  mode: AvailabilityMode | string | null | undefined,
): AvailabilityMode {
  return mode === AvailabilityMode.UNAVAILABLE
    ? AvailabilityMode.UNAVAILABLE
    : AvailabilityMode.AVAILABLE;
}
