import { IsString, IsOptional, IsObject } from 'class-validator';

export class InitiateChatDto {
  @IsString()
  expertId: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
