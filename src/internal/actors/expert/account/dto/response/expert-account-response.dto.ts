import { Type } from 'class-transformer';
import { BaseDto } from '@/shared/dto/base.dto';

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

export class ExpertAvatarMediaDto extends BaseDto {
  id!: string;
  public_id!: string | null;
  url!: string;
}

export class ExpertIntroVideoMediaDto extends BaseDto {
  id!: string;
  public_id!: string | null;
  url!: string;
}

export class ExpertAccountResponseDto extends BaseDto {
  id!: string;
  name!: string | null;
  about!: string | null;
  languages!: string | null;
  avatar!: string | null;
  avatar_id!: number | null;
  intro_video!: string | null;
  intro_video_id!: number | null;
  experience_in_years!: number;

  @Type(() => ExpertAvatarMediaDto)
  avatar_media!: ExpertAvatarMediaDto | null;

  @Type(() => ExpertIntroVideoMediaDto)
  intro_video_media!: ExpertIntroVideoMediaDto | null;

  @Type(() => ExpertProfessionItemResponseDto)
  professions!: ExpertProfessionItemResponseDto[];

  @Type(() => ExpertSpecializationResponseDto)
  specializations!: ExpertSpecializationResponseDto[];

  @Type(() => ExpertConsultationPricingResponseDto)
  pricing!: ExpertConsultationPricingResponseDto | null;
}
