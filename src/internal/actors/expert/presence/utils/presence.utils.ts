import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
  RealtimePresence,
} from '@/core/enums';

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
  if (realtimePresence === RealtimePresence.OFFLINE) {
    return ExpertClientStatus.OFFLINE;
  }
  if (availabilityMode === AvailabilityMode.UNAVAILABLE) {
    return ExpertClientStatus.OFFLINE;
  }
  if (consultationState === ConsultationState.BUSY) {
    return ExpertClientStatus.BUSY;
  }
  return ExpertClientStatus.ONLINE;
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
    ) === ExpertClientStatus.ONLINE
  );
}
