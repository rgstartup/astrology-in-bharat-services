import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendChatMessageDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  /** FK to `content.media` via `POST /client/chat/attachments`. Linked to the message on send. */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  attachmentMediaId?: number;

  /** @deprecated — legacy raw-URL passthrough, never persisted. Use `attachmentMediaId`. */
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentType?: string;
}

export class TypingChatDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsOptional()
  isTyping?: boolean;
}
