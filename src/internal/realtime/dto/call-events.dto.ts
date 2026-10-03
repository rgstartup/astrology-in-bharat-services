import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class JoinCallDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;
}

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

export class CallActionDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  consultationId!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
