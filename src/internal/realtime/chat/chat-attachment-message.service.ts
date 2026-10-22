import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  commonIdempotencyKeys,
  consultations,
  type NewMediaRow,
} from '@/core/drizzledb/schema';
import { MediaSource } from '@/internal/media/enum';
import { StorageService } from '@/external/storage';
import { MessageType } from '@/internal/consultation/enums';
import { ResourceNotFoundError } from '@/shared/errors';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import {
  persistChatMessage,
  resolveMessageSessionId,
  toMessageType,
} from './chat-message-persistence';
import { ChatAttachmentMessageError } from './chat-attachment-message.error';
import { RealtimeChatGateway } from './realtime-chat.gateway';

export type ChatAttachmentActorType = 'client' | 'expert';

export interface SendChatAttachmentInput {
  actorType: ChatAttachmentActorType;
  /** Polymorphic sender id (client account id or expert id). */
  actorId: number;
  consultationId: number;
  content?: string;
  file: Express.Multer.File | undefined;
  /** Client-generated UUID per send attempt; enables safe retry. */
  idempotencyKey?: string;
}

export interface ChatAttachmentMessagePayload {
  id: number;
  consultationId: number;
  senderId: number;
  senderType: ChatAttachmentActorType;
  content: string;
  messageType: MessageType;
  attachments: { url: string; mimeType: string | null }[];
  timestamp: string;
}

const IDEMPOTENCY_SCOPE = 'chat:attachment:send';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Textless attachment sends keep the real sender; content falls back. */
const DEFAULT_ATTACHMENT_CONTENT = 'sent an attachment';

/** Composer limit — mirrors the client mime/size guard. */
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
];

/**
 * Single code path for attachment sends from either actor. Storage upload
 * first (outside the DB transaction — object storage cannot roll back),
 * then message + media + link in one transaction, then a `chat:message`
 * emit to the room so both parties update via socket. Idempotent per
 * (actor, scope, client-supplied key): completed keys replay the stored
 * payload without re-executing.
 */
@Injectable()
export class ChatAttachmentMessageService {
  private readonly logger = new Logger(ChatAttachmentMessageService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly chatGateway: RealtimeChatGateway,
  ) {}

  async sendWithAttachment(
    input: SendChatAttachmentInput,
  ): Promise<ChatAttachmentMessagePayload> {
    const { actorType, actorId, consultationId } = input;
    const content = input.content?.trim() || DEFAULT_ATTACHMENT_CONTENT;
    const key = input.idempotencyKey?.trim() || null;
    const file = input.file;

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          consultationId,
          content,
          name: file?.originalname,
          size: file?.size,
          mime: file?.mimetype,
        }),
      )
      .digest('hex');

    if (key) {
      const replay = await this.claimKey(actorType, actorId, key, requestHash);
      if (replay) return replay;
    }

    try {
      const [consultation] = await this.db
        .select({
          client_id: consultations.client_id,
          expert_id: consultations.expert_id,
        })
        .from(consultations)
        .where(eq(consultations.id, consultationId))
        .limit(1);
      const isParticipant =
        actorType === 'expert'
          ? consultation?.expert_id === actorId
          : consultation?.client_id === actorId;
      if (!isParticipant) {
        throw new ResourceNotFoundError(
          'Consultation',
          consultationId.toString(),
        );
      }

      if (!file) {
        throw new ChatAttachmentMessageError('No file uploaded.');
      }
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new ChatAttachmentMessageError(
          `Unsupported file type ${file.mimetype}. Only images and PDF are allowed.`,
        );
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new ChatAttachmentMessageError(
          'File size must be less than 50MB.',
        );
      }

      let uploaded: {
        secureUrl: string;
        key: string;
        size: number;
        mimeType: string;
        provider: string;
        checksum?: string;
      };
      try {
        uploaded = await this.storage.uploadDocument(file, {
          filename: `chat_${consultationId}_${Date.now()}`,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
          maxSizeBytes: MAX_ATTACHMENT_BYTES,
        });
      } catch {
        throw new ChatAttachmentMessageError(
          'File upload failed. Please try again.',
        );
      }
      if (!uploaded.secureUrl) {
        throw new ChatAttachmentMessageError(
          'File upload did not return a valid file. Please try again.',
        );
      }

      const mimeType = uploaded.mimeType || file.mimetype;
      const messageType = toMessageType(
        mimeType.startsWith('image/') ? 'image' : 'file',
      );
      const mediaInsert: NewMediaRow = {
        url: uploaded.secureUrl,
        source:
          uploaded.provider === 'local'
            ? MediaSource.LOCAL
            : MediaSource.CLOUDINARY,
        public_id: uploaded.key,
        mime_type: mimeType,
        file_size: uploaded.size || file.size,
        file_name: file.originalname,
        storage_provider: uploaded.provider,
        storage_key: uploaded.key,
        checksum: uploaded.checksum,
      };
      const persisted = await persistChatMessage(this.db, {
        consultationId,
        sessionId: await resolveMessageSessionId(this.db, consultationId),
        senderId: actorId,
        senderType: actorType,
        content,
        messageType,
        mediaInsert,
      });

      const payload: ChatAttachmentMessagePayload = {
        id: persisted.id,
        consultationId,
        senderId: actorId,
        senderType: actorType,
        content,
        messageType,
        attachments: persisted.attachments,
        timestamp: persisted.createdAt.toISOString(),
      };

      this.chatGateway.server
        .to(SOCKET_ROOMS.CONSULTATION(consultationId))
        .emit(SOCKET_EVENTS.CHAT.MESSAGE, payload);

      if (key) {
        await this.db
          .update(commonIdempotencyKeys)
          .set({
            status: 'completed',
            resourceType: 'consultation_message',
            resourceId: persisted.id,
            responseStatus: 201,
            responseBody: payload as unknown as Record<string, unknown>,
          })
          .where(
            and(
              eq(commonIdempotencyKeys.actorType, actorType),
              eq(commonIdempotencyKeys.actorId, actorId),
              eq(commonIdempotencyKeys.scope, IDEMPOTENCY_SCOPE),
              eq(commonIdempotencyKeys.idempotencyKey, key),
            ),
          );
      }
      return payload;
    } catch (error) {
      if (key) {
        await this.db
          .update(commonIdempotencyKeys)
          .set({ status: 'failed' })
          .where(
            and(
              eq(commonIdempotencyKeys.actorType, actorType),
              eq(commonIdempotencyKeys.actorId, actorId),
              eq(commonIdempotencyKeys.scope, IDEMPOTENCY_SCOPE),
              eq(commonIdempotencyKeys.idempotencyKey, key),
              eq(commonIdempotencyKeys.status, 'processing'),
            ),
          );
      }
      throw error;
    }
  }

  /**
   * Insert a `processing` claim, or resolve an existing key: replay
   * completed sends, reject in-flight duplicates and key reuse with a
   * different payload, reclaim failed attempts. Returns the replay
   * payload when the send already succeeded, else null to proceed.
   */
  private async claimKey(
    actorType: ChatAttachmentActorType,
    actorId: number,
    key: string,
    requestHash: string,
  ): Promise<ChatAttachmentMessagePayload | null> {
    const [inserted] = await this.db
      .insert(commonIdempotencyKeys)
      .values({
        actorType,
        actorId,
        scope: IDEMPOTENCY_SCOPE,
        idempotencyKey: key,
        requestHash,
        status: 'processing',
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      })
      .onConflictDoNothing({
        target: [
          commonIdempotencyKeys.actorType,
          commonIdempotencyKeys.actorId,
          commonIdempotencyKeys.scope,
          commonIdempotencyKeys.idempotencyKey,
        ],
      })
      .returning({ id: commonIdempotencyKeys.id });
    if (inserted) return null;

    const [existing] = await this.db
      .select()
      .from(commonIdempotencyKeys)
      .where(
        and(
          eq(commonIdempotencyKeys.actorType, actorType),
          eq(commonIdempotencyKeys.actorId, actorId),
          eq(commonIdempotencyKeys.scope, IDEMPOTENCY_SCOPE),
          eq(commonIdempotencyKeys.idempotencyKey, key),
        ),
      )
      .limit(1);
    if (!existing) {
      throw new ConflictException(
        'Attachment send is already in progress. Please retry.',
      );
    }
    if (existing.requestHash !== requestHash) {
      throw new BadRequestException(
        'Idempotency key was already used with a different attachment.',
      );
    }
    if (
      existing.status === 'completed' &&
      existing.responseBody !== null &&
      typeof existing.responseBody === 'object'
    ) {
      this.logger.debug(
        `Idempotency replay for ${actorType}:${actorId} key ${key}.`,
      );
      return existing.responseBody as unknown as ChatAttachmentMessagePayload;
    }
    if (existing.status === 'processing') {
      throw new ConflictException(
        'Attachment send is already in progress. Please retry.',
      );
    }
    await this.db
      .update(commonIdempotencyKeys)
      .set({
        status: 'processing',
        requestHash,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      })
      .where(eq(commonIdempotencyKeys.id, existing.id));
    return null;
  }
}
