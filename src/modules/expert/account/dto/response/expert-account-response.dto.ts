import { Type } from 'class-transformer';
import { BaseDto } from '@/common/dto/base.dto';

export class ExpertSpecializationResponseDto extends BaseDto {
  id!: string;
  title!: string;
  slug!: string;
}

export class ExpertProfessionItemResponseDto extends BaseDto {
  id!: string;
  profession_id!: string;
  title!: string;
  slug!: string;
  icon!: string | null;
  is_primary!: boolean;
}

export class ExpertConsultationPricingResponseDto extends BaseDto {
  id!: string;
  call_price!: number | null;
  video_call_price!: number | null;
  chat_price!: number | null;
}

export { ExpertConsultationPricingResponseDto as ExpertPricingResponseDto };

export class ExpertAccountResponseDto extends BaseDto {
  id!: string;
  name!: string | null;
  about!: string | null;
  languages!: string | null;
  avatar!: string | null;
  experience_in_years!: number;

  @Type(() => ExpertProfessionItemResponseDto)
  professions!: ExpertProfessionItemResponseDto[];

  @Type(() => ExpertSpecializationResponseDto)
  specializations!: ExpertSpecializationResponseDto[];

  @Type(() => ExpertConsultationPricingResponseDto)
  pricing!: ExpertConsultationPricingResponseDto | null;
}

