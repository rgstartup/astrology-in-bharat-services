import { describe, expect, it } from 'vitest';
import {
  deriveExpertClientStatus,
  isAvailableForConsultation,
} from '../utils/presence.utils';
import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
} from '@/core/enums';

describe('PresenceUtils - Status Derivation', () => {
  const testMatrix: Array<{
    realtime: RealtimePresence;
    availability: AvailabilityMode;
    consultation: ConsultationState;
    expectedStatus: ExpertClientStatus;
    expectedAvailableForConsultation: boolean;
  }> = [
    // Realtime offline
    {
      realtime: RealtimePresence.OFFLINE,
      availability: AvailabilityMode.AVAILABLE,
      consultation: ConsultationState.IDLE,
      expectedStatus: ExpertClientStatus.OFFLINE,
      expectedAvailableForConsultation: false,
    },
    {
      realtime: RealtimePresence.OFFLINE,
      availability: AvailabilityMode.AVAILABLE,
      consultation: ConsultationState.BUSY,
      expectedStatus: ExpertClientStatus.OFFLINE,
      expectedAvailableForConsultation: false,
    },
    {
      realtime: RealtimePresence.OFFLINE,
      availability: AvailabilityMode.UNAVAILABLE,
      consultation: ConsultationState.IDLE,
      expectedStatus: ExpertClientStatus.OFFLINE,
      expectedAvailableForConsultation: false,
    },
    {
      realtime: RealtimePresence.OFFLINE,
      availability: AvailabilityMode.UNAVAILABLE,
      consultation: ConsultationState.BUSY,
      expectedStatus: ExpertClientStatus.OFFLINE,
      expectedAvailableForConsultation: false,
    },

    // Realtime online
    {
      realtime: RealtimePresence.ONLINE,
      availability: AvailabilityMode.AVAILABLE,
      consultation: ConsultationState.IDLE,
      expectedStatus: ExpertClientStatus.ONLINE,
      expectedAvailableForConsultation: true,
    },
    {
      realtime: RealtimePresence.ONLINE,
      availability: AvailabilityMode.AVAILABLE,
      consultation: ConsultationState.BUSY,
      expectedStatus: ExpertClientStatus.BUSY,
      expectedAvailableForConsultation: false,
    },
    {
      realtime: RealtimePresence.ONLINE,
      availability: AvailabilityMode.UNAVAILABLE,
      consultation: ConsultationState.IDLE,
      expectedStatus: ExpertClientStatus.OFFLINE,
      expectedAvailableForConsultation: false,
    },
    {
      realtime: RealtimePresence.ONLINE,
      availability: AvailabilityMode.UNAVAILABLE,
      consultation: ConsultationState.BUSY,
      expectedStatus: ExpertClientStatus.OFFLINE,
      expectedAvailableForConsultation: false,
    },
  ];

  testMatrix.forEach(
    ({
      realtime,
      availability,
      consultation,
      expectedStatus,
      expectedAvailableForConsultation,
    }) => {
      it(`should derive ${expectedStatus} when realtime=${realtime}, availability=${availability}, consultation=${consultation}`, () => {
        const derived = deriveExpertClientStatus(
          realtime,
          availability,
          consultation,
        );
        expect(derived).toBe(expectedStatus);

        const available = isAvailableForConsultation(
          realtime,
          availability,
          consultation,
        );
        expect(available).toBe(expectedAvailableForConsultation);
      });
    },
  );
});
