import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AttachmentType } from '../../domain/entities/dispute-message.entity';

export class SendMessageDto {
    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsString()
    attachmentUrl?: string;

    @IsOptional()
    @IsEnum(AttachmentType)
    attachmentType?: AttachmentType;
}
