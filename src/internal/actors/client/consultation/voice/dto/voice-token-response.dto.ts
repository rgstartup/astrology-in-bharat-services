import { IsDateString, IsString } from 'class-validator';

export class VoiceTokenResponseDto {
  @IsString()
  token!: string;

  @IsString()
  identity!: string;

  @IsString()
  channelName!: string;

  @IsDateString()
  expiresAt!: Date;
}
