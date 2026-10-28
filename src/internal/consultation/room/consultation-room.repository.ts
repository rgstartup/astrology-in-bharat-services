import { Injectable } from '@nestjs/common';
import { RedisService } from '@/core/redis/redis.service';
import 'dotenv/config';

/** Redis key for a consultation's live socket room. TTL = request window. */
export const consultationRoomKey = (consultationId: number): string =>
  `consultation:room:${consultationId}`;

/** Redis key for the expected and joined parties of a consultation room. */
export const consultationRoomPartiesKey = (consultationId: number): string =>
  `consultation:room:parties:${consultationId}`;

/** Single source of truth for the chat-request window, in milliseconds. */
export function chatRequestTtlMs(): number {
  const ms = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);
  return Math.max(1, ms);
}

/** Single source of truth for the chat-request window, in seconds. */
export function chatRequestTtlSeconds(): number {
  return Math.max(1, Math.ceil(chatRequestTtlMs() / 1000));
}

/**
 * Single source of truth for the media-ready window, in seconds.
 *
 * The readiness flags decide when the metered session starts, so they must
 * outlive the wait of the slower party in the lobby (the request window is
 * only 120s). A stale single-side flag cannot start billing on its own: the
 * start needs BOTH flags.
 */
export function consultationMediaTtlSeconds(): number {
  const seconds = parseInt(
    process.env.CONSULTATION_MEDIA_TTL_SECONDS || '900',
    10,
  );
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 900;
}

/** Redis key for a consultation's balance-exhaustion pause gate. TTL = expert wait window. */
export const consultationPausedKey = (consultationId: number): string =>
  `consultation:paused:${consultationId}`;

/** Redis key for a consultation's resume anchor (no TTL — lifecycle-owned). */
export const consultationAnchorKey = (consultationId: number): string =>
  `consultation:anchor:${consultationId}`;

/**
 * Redis key for a dialog-driven billing hold (mode switch / end confirmation).
 * Unlike the pause gate it does NOT block messaging; it only freezes the
 * billing clock. TTL = pause window so an abandoned dialog cannot freeze the
 * meter forever; the orchestrator re-arms billing when it lapses.
 */
export const consultationBillingHoldKey = (consultationId: number): string =>
  `consultation:billing_hold:${consultationId}`;

/**
 * Redis key for a consultation's affordable-minutes snapshot (no TTL —
 * lifecycle-owned, cleared on `chat:end`). Captured at initiate time from
 * the pre-hold wallet balance so the mid-chat HOLD (balance → reserved)
 * never shrinks the countdown. Shape: `{ m: maxMinutes, b: balanceAtSnap,
 * f: freeBasis }`. `reserved_balance` is deliberately never read.
 */
export const consultationBudgetKey = (consultationId: number): string =>
  `consultation:budget:${consultationId}`;

export interface BudgetSnapshot {
  maxMinutes: number;
  balanceAtSnap: number;
  /** 1 when the snapshot is the single-shot free grant (no recharge delta). */
  freeBasis: number;
}

/**
 * Redis key for a consultation's currently active metered mode (no TTL —
 * lifecycle-owned, cleared on `chat:end`). Set on `chat:join` (CHAT) and
 * `call:join` (declared audio/video kind); the budget rate follows it.
 */
export const consultationModeKey = (consultationId: number): string =>
  `consultation:mode:${consultationId}`;

/**
 * Redis key for voice/video media readiness (both sides inside Agora).
 * Shape: `{ c: 0|1, e: 0|1 }`. TTL = request window; lifecycle-owned like
 * the room key, cleared on `consultation:end` via the mode adapters.
 */
export const consultationMediaKey = (consultationId: number): string =>
  `consultation:media:${consultationId}`;

export interface MediaReadiness {
  clientReady: boolean;
  expertReady: boolean;
  bothReady: boolean;
}

/** `JSON.parse` yields `any` — narrow to a plain record before touching fields. */
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrow a parsed media-readiness record (`{ c, e }` flags). */
function isMediaRecord(value: unknown): value is { c: unknown; e: unknown } {
  return isJsonRecord(value);
}

/** Finite, non-negative JSON number (rejects NaN/Infinity/negatives). */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Single source of truth for the balance-pause wait window, in milliseconds.
 * The expert waits this long for the client to recharge before the chat ends.
 */
export function chatPauseTtlMs(): number {
  const ms = parseInt(process.env.CHAT_PAUSE_TTL_MS || '300000', 10);
  return Math.max(1, ms);
}

/** Single source of truth for the balance-pause wait window, in seconds. */
export function chatPauseTtlSeconds(): number {
  return Math.max(1, Math.ceil(chatPauseTtlMs() / 1000));
}

@Injectable()
export class ConsultationRoomRepository {
  constructor(private readonly redis: RedisService) {}

  /**
   * Arm the room and record its expected parties in shared Redis state.
   * Both keys receive the request-window TTL atomically.
   *
   * @param consultationId - Consultation whose room is being armed.
   * @param sessionId - Pending session associated with this room.
   * @param clientId - Expected client participant ID.
   * @param expertId - Expected expert participant ID.
   * @returns Redis acknowledgement for the room setup.
   * @throws Propagates Redis errors.
   */
  async armRoom(
    consultationId: number,
    sessionId: number,
    clientId: number,
    expertId: number,
  ): Promise<'OK' | null> {
    const parties = JSON.stringify({
      clientId,
      expertId,
      clientJoined: false,
      expertJoined: false,
    });
    const result = await this.redis.eval(
      "redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3]); " +
        "redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3]); " +
        "return 'OK'",
      2,
      consultationRoomKey(consultationId),
      consultationRoomPartiesKey(consultationId),
      String(sessionId),
      parties,
      chatRequestTtlSeconds(),
    );
    return result === 'OK' ? 'OK' : null;
  }

  /**
   * Record an authenticated party's room join and report when both expected
   * parties have joined. The operation validates the actor and updates the
   * shared state atomically across backend instances.
   *
   * @param consultationId - Consultation room being joined.
   * @param actorType - Joining party type.
   * @param actorId - Authenticated joining party ID.
   * @returns True when both expected parties have joined; otherwise false.
   * @throws Propagates Redis errors.
   */
  async recordPartyJoin(
    consultationId: number,
    actorType: 'client' | 'expert',
    actorId: number,
  ): Promise<boolean> {
    const result = await this.redis.eval(
      "local raw = redis.call('GET', KEYS[1]); " +
        "if not raw then return 0 end; " +
        "local state = cjson.decode(raw); " +
        "local expected = state[ARGV[1] .. 'Id']; " +
        "if tostring(expected) ~= ARGV[2] then return 0 end; " +
        "state[ARGV[1] .. 'Joined'] = true; " +
        "local ttl = redis.call('PTTL', KEYS[1]); " +
        "if ttl == -2 then return 0 end; " +
        "if ttl >= 0 then " +
        "redis.call('SET', KEYS[1], cjson.encode(state), 'PX', math.max(ttl, 1)); " +
        "else redis.call('SET', KEYS[1], cjson.encode(state), 'KEEPTTL'); end; " +
        "if state.clientJoined and state.expertJoined then return 1 end; " +
        "return 0",
      1,
      consultationRoomPartiesKey(consultationId),
      actorType,
      actorId,
    );
    return Number(result) === 1;
  }

  /**
   * Clear the room session and party-join state.
   *
   * @param consultationId - Consultation whose room state should be removed.
   * @returns Number of Redis keys removed.
   * @throws Propagates Redis errors.
   */
  clearRoom(consultationId: number): Promise<number> {
    return this.redis.del(
      consultationRoomKey(consultationId),
      consultationRoomPartiesKey(consultationId),
    );
  }

  /**
   * Refresh the room and party-state TTL from chat-request time.
   * False when the room key already lapsed.
   *
   * @param consultationId - Consultation whose room TTL should be refreshed.
   * @returns True when the room key still exists and was refreshed.
   * @throws Propagates Redis errors.
   */
  async refreshRoom(consultationId: number): Promise<boolean> {
    const sessionId = await this.roomSession(consultationId);
    if (!sessionId) return false;
    const result = await this.redis.eval(
      "if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end; " +
        "redis.call('EXPIRE', KEYS[1], ARGV[1]); " +
        "if redis.call('EXISTS', KEYS[2]) == 1 then " +
        "redis.call('EXPIRE', KEYS[2], ARGV[1]); end; " +
        "return 1",
      2,
      consultationRoomKey(consultationId),
      consultationRoomPartiesKey(consultationId),
      chatRequestTtlSeconds(),
    );
    return Number(result) === 1;
  }

  roomSession(consultationId: number): Promise<string | null> {
    return this.redis.get(consultationRoomKey(consultationId));
  }

  /**
   * Pause live messaging for a consultation (balance exhausted). The key TTL
   * is the expert wait window — expiry means the client never recharged.
   */
  pauseRoom(consultationId: number): Promise<'OK' | null> {
    return this.redis.set(
      consultationPausedKey(consultationId),
      new Date().toISOString(),
      chatPauseTtlSeconds(),
    );
  }

  async isPaused(consultationId: number): Promise<boolean> {
    return this.redis
      .get(consultationPausedKey(consultationId))
      .then((v) => v !== null);
  }

  /**
   * Remaining pause-window milliseconds from the paused-key TTL. Null when
   * no pause is armed (key missing or persistent) — callers fall back to a
   * full grace window.
   */
  async pausedTtlMs(consultationId: number): Promise<number | null> {
    const ms = await this.redis.pttl(consultationPausedKey(consultationId));
    return ms > 0 ? ms : null;
  }

  clearPaused(consultationId: number): Promise<number> {
    return this.redis.del(consultationPausedKey(consultationId));
  }

  /**
   * Freeze the billing clock for a dialog-driven hold. Writes the anchor at
   * `now` carrying the seconds consumed so far, then the hold flag (safety
   * TTL). Messaging stays open: this is not the balance pause gate.
   *
   * @param consultationId - ID of the consultation being held.
   * @param baseSeconds - Billable seconds consumed up to the hold.
   */
  async holdBilling(
    consultationId: number,
    baseSeconds: number,
  ): Promise<void> {
    await this.setAnchor(consultationId, new Date().toISOString(), baseSeconds);
    await this.redis.set(
      consultationBillingHoldKey(consultationId),
      '1',
      chatPauseTtlSeconds(),
    );
  }

  async isBillingHeld(consultationId: number): Promise<boolean> {
    const value = await this.redis.get(
      consultationBillingHoldKey(consultationId),
    );
    return value !== null;
  }

  /** Remaining hold-window milliseconds; null when the hold lapsed/missing. */
  async billingHoldTtlMs(consultationId: number): Promise<number | null> {
    const ms = await this.redis.pttl(
      consultationBillingHoldKey(consultationId),
    );
    return ms > 0 ? ms : null;
  }

  clearBillingHold(consultationId: number): Promise<number> {
    return this.redis.del(consultationBillingHoldKey(consultationId));
  }

  /**
   * Resume anchor for the room countdown. `baseSeconds` is the elapsed time
   * already consumed before the resume; the live elapsed is
   * `baseSeconds + (now - anchor)`. Set on `chat:resume`, cleared on
   * `chat:request` (fresh cycle) and `chat:end`. No TTL — lifecycle-owned.
   */
  setAnchor(
    consultationId: number,
    anchorIso: string,
    baseSeconds: number,
  ): Promise<'OK' | null> {
    return this.redis.set(
      consultationAnchorKey(consultationId),
      JSON.stringify({ a: anchorIso, b: Math.max(0, Math.floor(baseSeconds)) }),
    );
  }

  async getAnchor(
    consultationId: number,
  ): Promise<{ anchorIso: string; baseSeconds: number } | null> {
    const raw = await this.redis.get(consultationAnchorKey(consultationId));
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
    if (!isJsonRecord(parsed)) return null;
    const { a, b } = parsed;
    if (typeof a !== 'string' || Number.isNaN(Date.parse(a))) return null;
    if (!isCount(b)) return null;
    return { anchorIso: a, baseSeconds: Math.floor(b) };
  }

  clearAnchor(consultationId: number): Promise<number> {
    return this.redis.del(consultationAnchorKey(consultationId));
  }

  /**
   * Affordable-minutes snapshot for the room countdown. Set once at initiate
   * (pre-hold math), re-based on `chat:resume`, cleared on `chat:end`.
   * No TTL — lifecycle-owned like the resume anchor.
   */
  setBudget(
    consultationId: number,
    snapshot: BudgetSnapshot,
  ): Promise<'OK' | null> {
    return this.redis.set(
      consultationBudgetKey(consultationId),
      JSON.stringify({
        m: snapshot.maxMinutes,
        b: snapshot.balanceAtSnap,
        f: snapshot.freeBasis,
      }),
    );
  }

  async getBudget(consultationId: number): Promise<BudgetSnapshot | null> {
    const raw = await this.redis.get(consultationBudgetKey(consultationId));
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
    if (!isJsonRecord(parsed)) return null;
    const { m, b, f } = parsed;
    if (!isCount(m) || !isCount(b)) return null;
    return {
      maxMinutes: Math.floor(m),
      balanceAtSnap: b,
      freeBasis: f === 1 ? 1 : 0,
    };
  }

  clearBudget(consultationId: number): Promise<number> {
    return this.redis.del(consultationBudgetKey(consultationId));
  }

  /**
   * Currently metered mode for the shared budget (chat by default). Joins
   * record their side — chat joins set chat, call joins set the declared
   * audio/video kind — and the budget rate follows the stored value, so one
   * consultation burns at exactly one rate at a time across chat, audio
   * calls, and video calls. No TTL — lifecycle-owned like anchor/budget.
   */
  setActiveMode(consultationId: number, mode: string): Promise<'OK' | null> {
    return this.redis.set(consultationModeKey(consultationId), mode);
  }

  async getActiveMode(consultationId: number): Promise<string | null> {
    const raw = await this.redis.get(consultationModeKey(consultationId));
    if (!raw) return null;
    if (raw === 'AUDIO_CALL') return 'voice';
    if (raw === 'VIDEO_CALL') return 'video';
    if (raw === 'CHAT') return 'chat';
    return raw === 'chat' || raw === 'voice' || raw === 'video'
      ? raw
      : null;
  }

  clearActiveMode(consultationId: number): Promise<number> {
    return this.redis.del(consultationModeKey(consultationId));
  }

  /**
   * Mark one side media-ready (inside Agora) for voice/video. Both flags
   * live in one JSON record (`{ c, e }`) with the media window so a party
   * that waits in the lobby longer than the request window still pairs up.
   * A stale single-side ready can never start billing on its own: the start
   * requires both flags.
   *
   * @param consultationId - ID of the consultation going live on media.
   * @param actorType - Side reporting readiness (`client` | `expert`).
   * @returns Readiness flags plus `bothReady` when billing may start.
   */
  async markMediaReady(
    consultationId: number,
    actorType: 'client' | 'expert',
  ): Promise<MediaReadiness> {
    const raw = await this.redis.get(consultationMediaKey(consultationId));
    let client = false;
    let expert = false;
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw) as unknown;
        if (isMediaRecord(parsed)) {
          client = parsed.c === 1;
          expert = parsed.e === 1;
        }
      } catch {
        client = false;
        expert = false;
      }
    }
    if (actorType === 'client') client = true;
    else expert = true;
    await this.redis.set(
      consultationMediaKey(consultationId),
      JSON.stringify({ c: client ? 1 : 0, e: expert ? 1 : 0 }),
      consultationMediaTtlSeconds(),
    );
    return {
      clientReady: client,
      expertReady: expert,
      bothReady: client && expert,
    };
  }

  /**
   * Clear one side's media-ready flag (socket leave before billing starts).
   * Keeps the other side's flag so a transient drop costs one re-ready.
   *
   * @param consultationId - ID of the consultation leaving media.
   * @param actorType - Side clearing readiness (`client` | `expert`).
   */
  async unmarkMediaReady(
    consultationId: number,
    actorType: 'client' | 'expert',
  ): Promise<void> {
    const raw = await this.redis.get(consultationMediaKey(consultationId));
    if (!raw) return;
    let client = false;
    let expert = false;
    try {
      const parsed: unknown = JSON.parse(raw) as unknown;
      if (!isMediaRecord(parsed)) return;
      client = parsed.c === 1;
      expert = parsed.e === 1;
    } catch {
      return;
    }
    if (actorType === 'client') client = false;
    else expert = false;
    if (!client && !expert) {
      await this.redis.del(consultationMediaKey(consultationId));
      return;
    }
    await this.redis.set(
      consultationMediaKey(consultationId),
      JSON.stringify({ c: client ? 1 : 0, e: expert ? 1 : 0 }),
      consultationMediaTtlSeconds(),
    );
  }

  /**
   * Flush the media-readiness record (consultation end).
   *
   * @param consultationId - ID of the consultation being torn down.
   */
  clearMediaReady(consultationId: number): Promise<number> {
    return this.redis.del(consultationMediaKey(consultationId));
  }

  /**
   * Arm the request expiry timer. Re-uses the room key TTL.
   */
  async armRequestExpiry(consultationId: number): Promise<void> {
    await this.refreshRoom(consultationId);
  }

  /**
   * Cancel the request expiry timer by clearing the room key.
   */
  async cancelRequestExpiry(consultationId: number): Promise<void> {
    await this.clearRoom(consultationId);
  }
}
