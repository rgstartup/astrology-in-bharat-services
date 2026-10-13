import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import Redis from 'ioredis';
import { consultations } from '@/core/drizzledb/schema/consultation/consultation/consultation.schema';
import { consultationSessions } from '@/core/drizzledb/schema/consultation/session/consultation-session.schema';
import { clientWallets } from '@/core/drizzledb/schema/client/client-wallet.schema';
import { expertAccounts } from '@/core/drizzledb/schema/expert/expert-account.schema';
import {
  ConsultationMode,
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import {
  PRESENCE_CONSULTATION_TTL,
  PRESENCE_KEYS,
} from '@/internal/actors/expert/presence/presence.constants';
import { ConsultationState } from '@/core/enums';

/**
 * Phase D kill-9 drill (shutdown-safety verification).
 *
 * Runs ONLY when DRILL=seed|assert|cleanup. Skipped in normal `pnpm test`.
 * Talks to the LOCAL dev DB through the same Drizzle wiring as
 * DrizzleService (DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME) —
 * never raw SQL clients, never the Neon DATABASE_URL.
 *
 * Sequence (terminal):
 *   1. Boot backend with DATABASE_URL empty, PORT=6543.
 *   2. DRILL=seed   pnpm vitest run drill/   → inserts stale REQUESTED (id A),
 *      live ACTIVE + ACTIVE session (id B), forged BUSY marker (id 999999).
 *   3. kill -9 <backend pid>; reboot backend, capture boot log.
 *   4. DRILL=assert pnpm vitest run drill/  → cron flipped A past REQUESTED;
 *      B/session still ACTIVE; marker JSON printed for the repair HTTP hit.
 *   5. curl the singular expert-status endpoint (fires B2 repair), re-run
 *      DRILL=assert to confirm the marker is gone.
 *   6. DRILL=cleanup pnpm vitest run drill/ → deletes seeded rows.
 */
const DRILL = process.env.DRILL ?? '';
const run = DRILL === 'seed' || DRILL === 'assert' || DRILL === 'cleanup';

const SEED_CLIENT_ID = 8;
const SEED_EXPERT_ID = 1;
const FORGED_CONSULTATION_ID = 999999;

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'mysecret',
  database: process.env.DB_NAME ?? 'aib',
  max: Number(process.env.DB_MAX_CONNECTIONS ?? 10),
});
const db = drizzle(pool);
const redis = new Redis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  lazyConnect: true,
});

afterAll(async () => {
  try {
    await redis.quit();
  } catch {
    /* already closed */
  }
  await pool.end().catch(() => undefined);
});

(run ? describe : describe.skip)('phase-d kill-9 drill', () => {
  it('seed: pre-conditions hold (client 8 wallet, expert 1 pricing)', async () => {
    if (DRILL !== 'seed') return;
    const [wallet] = await db
      .select()
      .from(clientWallets)
      .where(eq(clientWallets.client_id, SEED_CLIENT_ID))
      .limit(1);
    expect(wallet, 'seed client wallet missing').toBeTruthy();
    const [expert] = await db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.id, SEED_EXPERT_ID))
      .limit(1);
    expect(expert, 'seed expert account missing').toBeTruthy();
  });

  it('seed: insert stale REQUESTED + live ACTIVE + forged BUSY marker', async () => {
    if (DRILL !== 'seed') return;
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [stale] = await db
      .insert(consultations)
      .values({
        client_id: SEED_CLIENT_ID,
        expert_id: SEED_EXPERT_ID,
        mode: ConsultationMode.CHAT,
        status: ConsultationStatus.REQUESTED,
        requested_at: tenMinAgo,
        updated_at: tenMinAgo,
      })
      .returning({ id: consultations.id });
    const [live] = await db
      .insert(consultations)
      .values({
        client_id: SEED_CLIENT_ID,
        expert_id: SEED_EXPERT_ID,
        mode: ConsultationMode.CHAT,
        status: ConsultationStatus.ACTIVE,
        accepted_at: new Date(),
        started_at: new Date(),
      })
      .returning({ id: consultations.id });
    await db.insert(consultationSessions).values({
      consultation_id: live.id,
      mode: ConsultationMode.CHAT,
      status: ConsultationSessionStatus.ACTIVE,
      started_at: new Date(),
    });
    await redis.connect();
    await redis.set(
      PRESENCE_KEYS.expertConsultation(SEED_EXPERT_ID),
      JSON.stringify({
        state: ConsultationState.BUSY,
        consultationId: String(FORGED_CONSULTATION_ID),
        updatedAt: Date.now(),
      }),
      'EX',
      PRESENCE_CONSULTATION_TTL,
    );
    process.stdout.write(
      `\nDRILL_IDS stale=${stale.id} live=${live.id}\n`,
    );
    expect(stale.id).toBeGreaterThan(0);
    expect(live.id).toBeGreaterThan(0);
  });

  it('assert: cron settled stale row, live row survived', async () => {
    if (DRILL !== 'assert') return;
    const staleId = Number(process.env.DRILL_STALE_ID ?? 0);
    const liveId = Number(process.env.DRILL_LIVE_ID ?? 0);
    expect(staleId, 'set DRILL_STALE_ID/DRILL_LIVE_ID').toBeGreaterThan(0);
    expect(liveId, 'set DRILL_STALE_ID/DRILL_LIVE_ID').toBeGreaterThan(0);
    const [stale] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, staleId))
      .limit(1);
    expect(stale?.status, 'cron did not settle stale REQUESTED').not.toBe(
      ConsultationStatus.REQUESTED,
    );
    const [live] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, liveId))
      .limit(1);
    expect(live?.status).toBe(ConsultationStatus.ACTIVE);
    await redis.connect();
    const marker = await redis.get(
      PRESENCE_KEYS.expertConsultation(SEED_EXPERT_ID),
    );
    process.stdout.write(`\nDRILL_MARKER ${marker ?? 'null'}\n`);
  });

  it('cleanup: delete seeded rows + forged marker', async () => {
    if (DRILL !== 'cleanup') return;
    const staleId = Number(process.env.DRILL_STALE_ID ?? 0);
    const liveId = Number(process.env.DRILL_LIVE_ID ?? 0);
    await redis.connect();
    await redis.del(PRESENCE_KEYS.expertConsultation(SEED_EXPERT_ID));
    for (const id of [staleId, liveId]) {
      if (!id) continue;
      await db
        .delete(consultationSessions)
        .where(eq(consultationSessions.consultation_id, id));
      await db.delete(consultations).where(eq(consultations.id, id));
    }
    expect(true).toBe(true);
  });
});
