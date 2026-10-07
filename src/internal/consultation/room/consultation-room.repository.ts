import { Injectable } from '@nestjs/common';
import { RedisService } from '@/core/redis/redis.service';
import 'dotenv/config';

/** Redis key for a consultation's live socket room. TTL = request window. */
export const consultationRoomKey = (consultationId: number): string =>
  `consultation:room:${consultationId}`;

/** Single source of truth for the chat-request window, in milliseconds. */
export function chatRequestTtlMs(): number {
  const ms = parseInt(process.env.CHAT_REQUEST_EXPIRY_MS || '120000', 10);
  return Math.max(1, ms);
}

/** Single source of truth for the chat-request window, in seconds. */
export function chatRequestTtlSeconds(): number {
  return Math.max(1, Math.ceil(chatRequestTtlMs() / 1000));
}

@Injectable()
export class ConsultationRoomRepository {
  constructor(private readonly redis: RedisService) {}

  /** Arm the room key; request-window expiry is enforced by the key TTL. */
  armRoom(consultationId: number, sessionId: number): Promise<'OK' | null> {
    return this.redis.set(
      consultationRoomKey(consultationId),
      String(sessionId),
      chatRequestTtlSeconds(),
    );
  }

  clearRoom(consultationId: number): Promise<number> {
    return this.redis.del(consultationRoomKey(consultationId));
  }

  /**
   * Re-arm the room TTL from `chat:request` time so the Redis window matches
   * the expiry timer (the key was first armed earlier, at REST initiate).
   * False when the key already lapsed — the timer + cron still own expiry.
   */
  async refreshRoom(consultationId: number): Promise<boolean> {
    const sessionId = await this.roomSession(consultationId);
    if (!sessionId) return false;
    await this.redis.set(
      consultationRoomKey(consultationId),
      sessionId,
      chatRequestTtlSeconds(),
    );
    return true;
  }

  roomSession(consultationId: number): Promise<string | null> {
    return this.redis.get(consultationRoomKey(consultationId));
  }
}
