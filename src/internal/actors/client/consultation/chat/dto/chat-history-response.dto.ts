import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseDto } from '@/shared/dto/base.dto';

export class ChatHistoryAttachmentDto extends BaseDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  mimeType?: string | null;
}

export class ChatHistoryMessageDto extends BaseDto {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsInt()
  sessionId?: number | null;

  @IsInt()
  senderId!: number;

  @IsString()
  senderType!: string;

  @IsString()
  content!: string;

  @IsISO8601()
  timestamp!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryAttachmentDto)
  attachments!: ChatHistoryAttachmentDto[];
}

export class ChatHistorySessionDto extends BaseDto {
  @IsInt()
  sessionId!: number;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  mode?: string | null;

  @IsOptional()
  @IsISO8601()
  startedAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endedAt?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  messages!: ChatHistoryMessageDto[];
}

export class ChatHistoryResponseDto extends BaseDto {
  @IsInt()
  consultationId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistorySessionDto)
  sessions!: ChatHistorySessionDto[];
}

/** Raw session shape selected in `GetChatHistoryUseCase`. */
export interface ChatHistorySessionRow {
  sessionId: number;
  status: string;
  mode: string;
  startedAt: Date | null;
  endedAt: Date | null;
}

/** Raw message shape selected in `GetChatHistoryUseCase`. */
export interface ChatHistoryMessageRow {
  id: number;
  sessionId: number | null;
  senderId: number;
  senderType: string;
  content: string;
  createdAt: Date;
  attachmentId: number | null;
  attachmentUrl: string | null;
  attachmentMimeType: string | null;
}

/**
 * Best-effort owner for pre-migration rows whose `session_id` is null:
 * the latest session whose [started_at, ended_at] window contains the
 * message timestamp. New writes always carry `session_id`, so this only
 * triggers for legacy history.
 */
function windowOwner(
  sessions: ChatHistorySessionRow[],
  createdAt: Date,
): ChatHistorySessionRow | undefined {
  const at = createdAt.getTime();
  let owner: ChatHistorySessionRow | undefined;
  for (const session of sessions) {
    const start = session.startedAt ? session.startedAt.getTime() : Number.NEGATIVE_INFINITY;
    const end = session.endedAt ? session.endedAt.getTime() : Number.POSITIVE_INFINITY;
    if (start <= at && at <= end && (!owner || session.sessionId > owner.sessionId)) {
      owner = session;
    }
  }
  return owner;
}

/**
 * Map Drizzle rows to the nested API contract
 * consultation → sessions → messages → attachments.
 * The attachment join fans out one row per attachment; rows are regrouped
 * so each message carries its full `attachments` array.
 */
export function toChatHistoryResponse(
  consultationId: number,
  sessions: ChatHistorySessionRow[],
  rows: ChatHistoryMessageRow[],
): ChatHistoryResponseDto {
  const byId = new Map<number, ChatHistoryMessageDto>();
  const order: ChatHistoryMessageDto[] = [];

  for (const row of rows) {
    let message = byId.get(row.id);
    if (!message) {
      message = {
        id: row.id,
        sessionId: row.sessionId,
        senderId: row.senderId,
        senderType: row.senderType,
        content: row.content,
        timestamp: row.createdAt.toISOString(),
        attachments: [],
      };
      byId.set(row.id, message);
      order.push(message);
    }
    if (row.attachmentId != null && row.attachmentUrl) {
      message.attachments.push({
        url: row.attachmentUrl,
        mimeType: row.attachmentMimeType,
      });
    }
  }

  const latest = sessions[sessions.length - 1];
  const buckets = new Map<number, ChatHistoryMessageDto[]>();
  for (const message of order) {
    const exact = message.sessionId
      ? sessions.find((s) => s.sessionId === message.sessionId)
      : undefined;
    const owner =
      exact ?? windowOwner(sessions, new Date(message.timestamp)) ?? latest;
    if (!owner) continue;
    message.sessionId = owner.sessionId;
    const bucket = buckets.get(owner.sessionId);
    if (bucket) bucket.push(message);
    else buckets.set(owner.sessionId, [message]);
  }

  return ChatHistoryResponseDto.from({
    consultationId,
    sessions: sessions.map((session) => ({
      sessionId: session.sessionId,
      status: session.status,
      mode: session.mode,
      startedAt: session.startedAt ? session.startedAt.toISOString() : null,
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
      messages: buckets.get(session.sessionId) ?? [],
    })),
  });
}
