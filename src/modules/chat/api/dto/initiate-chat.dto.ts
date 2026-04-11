import { IsNumber, IsOptional, IsObject } from 'class-validator';

export class InitiateChatDto {
  @IsNumber()
  expertId: number;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
