import { Type } from 'class-transformer';
import { BaseDto } from '@/common/dto/base.dto';

export class ExpertSpecializationResponseDto extends BaseDto {
  id!: string;
  title!: string;
  slug!: string;
}

export class ExpertPricingResponseDto extends BaseDto {
  id!: string;
  call_price!: number | null;
  video_call_price!: number | null;
  chat_price!: number | null;
  report_price!: number | null;
  horoscope_price!: number | null;
}

export class ExpertAccountResponseDto extends BaseDto {
  id!: string;
  name!: string | null;
  about!: string | null;
  languages!: string | null;
  avatar!: string | null;
  experience_in_years!: number;

  @Type(() => ExpertSpecializationResponseDto)
  specializations!: ExpertSpecializationResponseDto[];

  @Type(() => ExpertPricingResponseDto)
  pricing!: ExpertPricingResponseDto | null;
}

