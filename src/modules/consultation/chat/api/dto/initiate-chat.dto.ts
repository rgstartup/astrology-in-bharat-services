import { IsNumber, IsOptional, IsObject } from 'class-validator';

export class InitiateChatDto {
  @IsNumber()
  expertId: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
