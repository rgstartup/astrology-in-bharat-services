import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations, clientAccounts } from '@/core/drizzledb/schema';
import { ConsultationMode, ConsultationStatus } from '@/internal/consultation/enums';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { VoiceService } from '@/external/voice/voice.service';
import { VoiceTokenResponseDto } from '../dto/voice-token-response.dto';
import {
  ClientNotFoundError,
  ConsultationNotAvailableError,
} from '../errors';

/** Consultation states that may hold a live voice room. */
const OPEN_STATUSES = [
  ConsultationStatus.REQUESTED,
  ConsultationStatus.ACCEPTED,
  ConsultationStatus.ACTIVE,
];

@Injectable()
export class GetVoiceTokenUsecase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly voice: VoiceService,
  ) {}

  /**
   * Mints a voice token scoped to the consultation's Agora channel.
   * Channel convention shared with the realtime socket-ack path and the
   * client RTC layer: `SOCKET_ROOMS.VOICE_SESSION` (`consultation:voice:<id>`).
   *
   * @param clientId - Owner of the consultation.
   * @param consultationId - Consultation holding the voice room.
   * @returns Token, identity, channel name, and expiry.
   * @throws ClientNotFoundError when the client row is missing.
   * @throws ConsultationNotAvailableError when the consultation is missing,
   * foreign-owned, not a voice consultation, or already closed.
   */
  async execute(
    clientId: number,
    consultationId: number,
  ): Promise<VoiceTokenResponseDto> {
    const [client] = await this.db
      .select({ id: clientAccounts.id })
      .from(clientAccounts)
      .where(eq(clientAccounts.id, clientId))
      .limit(1);
    if (!client) throw new ClientNotFoundError();

    const [consultation] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);
    if (!consultation || consultation.client_id !== clientId) {
      throw new ConsultationNotAvailableError(
        consultationId,
        'Consultation not found.',
      );
    }
    if (consultation.mode !== ConsultationMode.VOICE) {
      throw new ConsultationNotAvailableError(
        consultationId,
        'Consultation is not a voice consultation.',
      );
    }
    if (!OPEN_STATUSES.includes(consultation.status)) {
      throw new ConsultationNotAvailableError(
        consultationId,
        'Consultation is already closed.',
      );
    }

    const channelName = SOCKET_ROOMS.VOICE_SESSION(consultationId);
    const identity = `client_${clientId}_consult_${consultationId}`;

    const issued = await this.voice.generateToken({
      identity,
      channelName,
    });

    return {
      token: issued.token,
      identity: issued.identity,
      channelName,
      expiresAt: issued.expiresAt,
    };
  }
}
