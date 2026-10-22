import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts, consultations } from '@/core/drizzledb/schema';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';

/**
 * Room membership check for `chat:{consultationId}`. The requester must be
 * the consultation's client or expert — anything else gets IGNORED.
 */
export async function isChatParticipant(
  db: DrizzleDb,
  consultationId: number,
  identity: AuthenticatedSocketIdentity,
): Promise<boolean> {
  const [row] = await db
    .select({
      client_id: consultations.client_id,
      expert_id: consultations.expert_id,
    })
    .from(consultations)
    .where(eq(consultations.id, consultationId))
    .limit(1);
  if (!row) return false;
  return identity.actorType === 'expert'
    ? row.expert_id === identity.expertId
    : row.client_id === identity.id;
}

/**
 * Authoritative parent-consultation status for `chat:join` acks, so a client
 * that (re)joins after the verdict still learns the real state instead of
 * waiting on a `chat:accepted` event it already missed.
 */
export async function getConsultationStatus(
  db: DrizzleDb,
  consultationId: number,
): Promise<string | null> {
  const [row] = await db
    .select({ status: consultations.status })
    .from(consultations)
    .where(eq(consultations.id, consultationId))
    .limit(1);
  return row?.status ?? null;
}

/**
 * Display name of the consultation's client for expert-facing surfaces
 * (`chat:join` ack, `chat:incoming`). Reads the client account name only —
 * no users-table fallback. Null when unresolvable.
 */
export async function resolveChatClientName(
  db: DrizzleDb,
  consultationId: number,
): Promise<string | null> {
  const [row] = await db
    .select({
      accountName: clientAccounts.name,
    })
    .from(consultations)
    .leftJoin(clientAccounts, eq(clientAccounts.id, consultations.client_id))
    .where(eq(consultations.id, consultationId))
    .limit(1);
  return row?.accountName ?? null;
}
