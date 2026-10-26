import type { ConsultationEndedPayload } from './consultation-orchestrator.types';

/**
 * Event name emitted across NestJS event loop when a consultation
 * is completed or cancelled.
 */
export const CONSULTATION_ENDED_EVENT = 'consultation.ended';

export type ConsultationEndedEvent = ConsultationEndedPayload;
