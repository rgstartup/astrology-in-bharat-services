import { Type } from 'class-transformer';
import type { ConsultationConfig } from '@/config/consultation.config';
import { BaseDto } from '@/shared/dto/base.dto';

interface ReservationPricing {
  chat_price: number | null;
  call_price: number | null;
}

/** Minimum reservation details for one consultation mode. */
export class ExpertModeReservationRequirementDto extends BaseDto {
  price_per_minute!: number | null;
  min_minutes_required!: number;
  min_balance_required!: number | null;
}

/** Reservation pricing requirements for supported consultation modes. */
export class ExpertReservationRequirementsDto extends BaseDto {
  @Type(() => ExpertModeReservationRequirementDto)
  chat!: ExpertModeReservationRequirementDto;

  @Type(() => ExpertModeReservationRequirementDto)
  voice!: ExpertModeReservationRequirementDto;
}

/** Expert discovery profile returned by the single-expert endpoint. */
export class ExpertDiscoveryResponseDto extends BaseDto {
  id!: number;
  about!: string | null;
  languages!: string | null;
  name!: string | null;
  avatar!: string | null;
  experience_in_years!: number;
  rating!: number | null;
  total_reviews!: number;
  total_likes!: number;
  is_available!: boolean;
  availability_mode!: string | null;
  last_seen_at!: Date | null;
  status!: string;
  isAvailableForConsultation!: boolean;
  lastSeenAt!: string | null;
  expert_professions!: unknown[];
  professions!: unknown[];
  specializations!: unknown[];
  pricing!: {
    chat_price: number | null;
    call_price: number | null;
    video_call_price: number | null;
  } | null;

  @Type(() => ExpertReservationRequirementsDto)
  reservation_requirements!: ExpertReservationRequirementsDto;

  /**
   * Builds the discovery response and derives mode-specific reserve amounts.
   * @param profile Expert profile fields, including the public pricing object.
   * @param reservationPricing Effective chat and voice rates used for eligibility.
   * @param config Consultation reservation duration configuration.
   * @returns A discovery response DTO with calculated reservation requirements.
   */
  static fromExpert(
    profile: object,
    reservationPricing: ReservationPricing,
    config: Partial<ConsultationConfig>,
  ): ExpertDiscoveryResponseDto {
    const chatMinutes = this.toMinutes(config.min_reserve_chat_duration_sec, 1);
    const voiceMinutes = this.toMinutes(config.min_reserve_voice_duration_sec, 5);

    return ExpertDiscoveryResponseDto.from({
      ...profile,
      reservation_requirements: {
        chat: this.toRequirement(reservationPricing.chat_price, chatMinutes),
        voice: this.toRequirement(reservationPricing.call_price, voiceMinutes),
      },
    });
  }

  private static toMinutes(durationSeconds: string | undefined, fallback: number): number {
    const seconds = Number(durationSeconds);
    return Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds / 60)
      : fallback;
  }

  private static toRequirement(price: number | null, minutes: number) {
    return {
      price_per_minute: price,
      min_minutes_required: minutes,
      min_balance_required: price === null ? null : price * minutes,
    };
  }
}
