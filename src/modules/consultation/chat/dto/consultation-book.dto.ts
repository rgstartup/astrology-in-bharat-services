import { IsNotEmpty, IsNumber, IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsultationBookDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  expert_id!: number;

  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  astrologer_name?: string;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
