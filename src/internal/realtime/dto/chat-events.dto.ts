import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class JoinChatDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}

export class LeaveChatDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}

export class SendChatMessageDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

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

export class ChatRequestDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  expertId!: number;
}

export class ChatActionDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}
