import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, and } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultationMessageAttachments,
  consultationMessages,
  consultations,
  consultationSessions,
  media,
} from '@/core/drizzledb/schema';
import { ConsultationNotAvailableError } from '../errors';
import {
  ChatHistoryResponseDto,
  toChatHistoryResponse,
} from '../dto/chat-history-response.dto';

/** Consultation-scoped message history (ascending, capped). */
@Injectable()
export class GetChatHistoryUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Loads a client's consultation, including its owning expert, session
   * history, and messages for room seeding.
   *
   * @param clientId - Authenticated client profile ID.
   * @param consultationId - Consultation whose room seed is requested.
   * @returns Consultation identity and its session/message history.
   * @throws ConsultationNotAvailableError when the client cannot access it.
   */
  async execute(
    clientId: number,
    consultationId: number,
  ): Promise<ChatHistoryResponseDto> {
    // 1. Validate consultation access
    const [consultation] = await this.db
      .select({ id: consultations.id, expertId: consultations.expert_id })
      .from(consultations)
      .where(
        and(
          eq(consultations.id, consultationId),
          eq(consultations.client_id, clientId),
        ),
      )
      .limit(1);

    if (!consultation) {
      throw new ConsultationNotAvailableError(
        consultationId,
        'Consultation not found or not accessible.',
      );
    }

    // 2. Fetch all sessions (a consultation may own several — reconnects
    // spawn new rows) plus all messages, oldest first
    const [sessions, messages] = await Promise.all([
      this.db
        .select({
          sessionId: consultationSessions.id,
          status: consultationSessions.status,
          mode: consultationSessions.mode,
          startedAt: consultationSessions.started_at,
          endedAt: consultationSessions.ended_at,
          endedReason: consultationSessions.ended_reason,
        })
        .from(consultationSessions)
        .where(eq(consultationSessions.consultation_id, consultationId))
        .orderBy(asc(consultationSessions.id)),
      this.db
        .select({
          id: consultationMessages.id,
          sessionId: consultationMessages.session_id,
          senderId: consultationMessages.sender_id,
          senderType: consultationMessages.sender_type,
          content: consultationMessages.content,
          createdAt: consultationMessages.created_at,
          attachmentId: consultationMessageAttachments.id,
          attachmentUrl: media.url,
          attachmentMimeType: media.mime_type,
        })
        .from(consultationMessages)
        .leftJoin(
          consultationMessageAttachments,
          eq(
            consultationMessageAttachments.message_id,
            consultationMessages.id,
          ),
        )
        .leftJoin(media, eq(consultationMessageAttachments.media_id, media.id))
        .where(eq(consultationMessages.consultation_id, consultationId))
        .orderBy(asc(consultationMessages.created_at)),
    ]);

    return toChatHistoryResponse(
      consultationId,
      consultation.expertId,
      sessions,
      messages,
    );
  }
}
