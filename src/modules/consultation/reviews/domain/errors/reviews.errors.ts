import { DomainError } from '@/common/types/domain.error';

export class ExpertNotFoundError extends DomainError {
  constructor(expertId: string) {
    super();
    this.message = `Expert with ID ${expertId} not found`;
  }
  readonly code = 'EXPERT_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
}

export class SessionNotFoundError extends DomainError {
  constructor(sessionId: string) {
    super();
    this.message = `Session with ID ${sessionId} not found`;
  }
  readonly code = 'SESSION_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
}

export class CannotReviewUnparticipatedSessionError extends DomainError {
  readonly code = 'CANNOT_REVIEW_UNPARTICIPATED_SESSION';
  readonly message = 'You can only review sessions you participated in';
  readonly httpStatus = 400;
}

export class SessionAlreadyReviewedError extends DomainError {
  readonly code = 'SESSION_ALREADY_REVIEWED';
  readonly message = 'You have already submitted a review for this session';
  readonly httpStatus = 400;
}
