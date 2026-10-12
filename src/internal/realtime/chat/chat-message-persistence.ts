import { desc, eq } from 'drizzle-orm';
import { WsException } from '@nestjs/websockets';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  consultationMessageAttachments,
  consultationMessages,
  consultationSessions,
  media,
  type NewMediaRow,
} from '@/core/drizzledb/schema';
import { ConsultationSessionStatus } from '@/internal/consultation/enums';
import { MessageType } from '@/internal/consultation/chat/enum';

/** Socket `attachmentType` → persisted message type. No media resolution yet (see below). */
export function toMessageType(
  attachmentType?: string,
): MessageType {
  if (attachmentType === 'image') return MessageType.IMAGE;
  if (attachmentType != null && attachmentType !== '') return MessageType.FILE;
  return MessageType.TEXT;
}

export interface PersistedChatMessageAttachment {
  url: string;
  mimeType: string | null;
}

export interface PersistedChatMessage {
  id: number;
  createdAt: Date;
  attachments: PersistedChatMessageAttachment[];
}

/**
 * Resolve the session that owns a message sent right now: the latest ACTIVE
 * session, falling back to the latest session overall (reconnects spawn new
 * rows; a message sent between sessions belongs to the most recent one).
 * Returns null when the consultation has no session yet.
 */
export async function resolveMessageSessionId(
  db: DrizzleDb,
  consultationId: number,
): Promise<number | null> {
  const candidates = await db
    .select({
      id: consultationSessions.id,
      status: consultationSessions.status,
    })
    .from(consultationSessions)
    .where(eq(consultationSessions.consultation_id, consultationId))
    .orderBy(desc(consultationSessions.id))
    .limit(10);
  if (candidates.length === 0) return null;
  return (
    candidates.find((c) => c.status === ConsultationSessionStatus.ACTIVE)?.id ??
    candidates[0].id
  );
}

/**
 * Persist an outgoing chat message. When `mediaId` is provided, the
 * `content.media` row must exist — it is linked via
 * `consultation_message_attachments` in the same transaction so history
 * (which joins attachments → media) shows it on reload. When
 * `mediaInsert` is provided instead, the media row itself is created in
 * the same transaction (HTTP attachment-send flow) — no orphan media
 * rows when the send never completes.
 */
export async function persistChatMessage(
  db: DrizzleDb,
  input: {
    consultationId: number;
    sessionId: number | null;
    senderId: number;
    senderType: string;
    content: string;
    messageType: MessageType;
    mediaId?: number;
    mediaInsert?: NewMediaRow;
  },
): Promise<PersistedChatMessage> {
  return db.transaction(async (tx: DrizzleTx) => {
    const [row] = await tx
      .insert(consultationMessages)
      .values({
        consultation_id: input.consultationId,
        session_id: input.sessionId,
        sender_id: input.senderId,
        sender_type: input.senderType,
        message_type: input.messageType,
        content: input.content,
      })
      .returning({
        id: consultationMessages.id,
        createdAt: consultationMessages.created_at,
      });

    const attachments: PersistedChatMessageAttachment[] = [];
    const mediaId = input.mediaId ?? (await insertMessageMedia(tx, input.mediaInsert));
    if (mediaId !== undefined) {
      const [asset] = await tx
        .select({ id: media.id, url: media.url, mimeType: media.mime_type })
        .from(media)
        .where(eq(media.id, mediaId))
        .limit(1);
      if (!asset) {
        throw new WsException({
          code: 'CHAT_ATTACHMENT_NOT_FOUND',
          message: 'Attachment not found. Please upload the file again.',
        });
      }
      await tx.insert(consultationMessageAttachments).values({
        message_id: row.id,
        media_id: asset.id,
      });
      attachments.push({ url: asset.url, mimeType: asset.mimeType });
    }
    return { id: row.id, createdAt: row.createdAt, attachments };
  });
}

async function insertMessageMedia(
  tx: DrizzleTx,
  insert: NewMediaRow | undefined,
): Promise<number | undefined> {
  if (!insert) return undefined;
  const [row] = await tx.insert(media).values(insert).returning({ id: media.id });
  return row.id;
}
