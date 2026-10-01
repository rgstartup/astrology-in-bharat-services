import { describe, expect, it } from 'vitest';
import {
  deriveExpertClientStatus,
  isAvailableForConsultation,
} from '../utils/presence.utils';
import {
  AvailabilityMode,
  ConsultationState,
  RealtimePresence,
} from '../presence.types';

describe('PresenceUtils - Status Derivation', () => {
  const testMatrix: Array<{
    realtime: RealtimePresence;
    availability: AvailabilityMode;
    consultation: ConsultationState;
    expectedStatus: 'online' | 'busy' | 'offline';
    expectedAvailableForConsultation: boolean;
  }> = [
    // Realtime offline
    {
      realtime: 'offline',
      availability: 'available',
      consultation: 'idle',
      expectedStatus: 'offline',
      expectedAvailableForConsultation: false,
    },
    {
      realtime: 'offline',
      availability: 'available',
      consultation: 'busy',
      expectedStatus: 'offline',
      expectedAvailableForConsultation: false,
    },
    {
      realtime: 'offline',
      availability: 'unavailable',
      consultation: 'idle',
      expectedStatus: 'offline',
      expectedAvailableForConsultation: false,
    },
    {
      realtime: 'offline',
      availability: 'unavailable',
      consultation: 'busy',
      expectedStatus: 'offline',
      expectedAvailableForConsultation: false,
    },

    // Realtime online
    {
      realtime: 'online',
      availability: 'available',
      consultation: 'idle',
      expectedStatus: 'online',
      expectedAvailableForConsultation: true,
    },
    {
      realtime: 'online',
      availability: 'available',
      consultation: 'busy',
      expectedStatus: 'busy',
      expectedAvailableForConsultation: false,
    },
    {
      realtime: 'online',
      availability: 'unavailable',
      consultation: 'idle',
      expectedStatus: 'offline',
      expectedAvailableForConsultation: false,
    },
    {
      realtime: 'online',
      availability: 'unavailable',
      consultation: 'busy',
      expectedStatus: 'offline',
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
