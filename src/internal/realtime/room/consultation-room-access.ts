import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts, consultations } from '@/core/drizzledb/schema';
import type { AuthenticatedSocketIdentity } from '../types/socket-auth.types';

/**
 * Validates whether the socket identity is an authoritative participant
 * (client or expert) of the specified consultation.
 *
 * @param db - Drizzle database instance.
 * @param consultationId - Primary key of the consultation.
 * @param identity - Authenticated identity attached to the socket.
 * @returns True if the actor is the client or assigned expert.
 */
export async function isConsultationParticipant(
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

export interface ConsultationLifecycleRecord {
  status: string;
  mode: string;
}

/**
 * Authoritative consultation lifecycle record for `consultation:join` acks,
 * allowing clients or experts reconnecting after state changes to receive
 * current server status and mode.
 *
 * @param db - Drizzle database instance.
 * @param consultationId - Primary key of the consultation.
 * @returns Status and mode record or null.
 */
export async function getConsultationLifecycle(
  db: DrizzleDb,
  consultationId: number,
): Promise<ConsultationLifecycleRecord | null> {
  const [row] = await db
    .select({ status: consultations.status, mode: consultations.mode })
    .from(consultations)
    .where(eq(consultations.id, consultationId))
    .limit(1);
  return row ? { status: row.status, mode: row.mode } : null;
}

/**
 * Authoritative consultation lifecycle status for `consultation:join` acks,
 * allowing clients or experts reconnecting after state changes to receive
 * current server truth.
 *
 * @param db - Drizzle database instance.
 * @param consultationId - Primary key of the consultation.
 * @returns Current consultation status string or null.
 */
export async function getConsultationStatus(
  db: DrizzleDb,
  consultationId: number,
): Promise<string | null> {
  const row = await getConsultationLifecycle(db, consultationId);
  return row?.status ?? null;
}

/**
 * Resolves the display name of the consultation's client for expert-facing
 * room payloads (`consultation:join` ack, `consultation:incoming`).
 *
 * @param db - Drizzle database instance.
 * @param consultationId - Primary key of the consultation.
 * @returns Name string or null if unresolvable.
 */
export async function resolveConsultationClientName(
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

/** Legacy aliases for backward compatibility during transition */
export const isChatParticipant = isConsultationParticipant;
export const resolveChatClientName = resolveConsultationClientName;
