import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
} from '../presence.types';

/**
 * Single authoritative client status derivation:
 *
 * realtimePresence  availabilityMode  consultationState  => status
 * ----------------------------------------------------------------
 * offline           available         idle               => offline
 * offline           available         busy               => offline
 * offline           unavailable       idle               => offline
 * offline           unavailable       busy               => offline
 *
 * online            available         idle               => online
 * online            available         busy               => busy
 * online            unavailable       idle               => offline
 * online            unavailable       busy               => offline
 */
export function deriveExpertClientStatus(
  realtimePresence: RealtimePresence,
  availabilityMode: AvailabilityMode,
  consultationState: ConsultationState,
): ExpertClientStatus {
  if (realtimePresence === 'offline') {
    return 'offline';
  }
  if (availabilityMode === 'unavailable') {
    return 'offline';
  }
  if (consultationState === 'busy') {
    return 'busy';
  }
  return 'online';
}

/**
 * Returns true if the expert can accept a new consultation:
 * Must be realtime online, available, and not currently busy.
 */
export function isAvailableForConsultation(
  realtimePresence: RealtimePresence,
  availabilityMode: AvailabilityMode,
  consultationState: ConsultationState,
): boolean {
  return (
    deriveExpertClientStatus(
      realtimePresence,
      availabilityMode,
      consultationState,
    ) === 'online'
  );
}
