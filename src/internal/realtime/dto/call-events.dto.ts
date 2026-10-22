import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CallOfferDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsObject()
  @IsNotEmpty()
  offer!: Record<string, any>;
}

export class CallAnswerDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsObject()
  @IsNotEmpty()
  answer!: Record<string, any>;
}

export class IceCandidateDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsObject()
  @IsNotEmpty()
  candidate!: Record<string, any>;
}
