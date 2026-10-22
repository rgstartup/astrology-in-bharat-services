import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class TwilioVideoConfigurationMissingError extends DomainError {
  readonly code = 'VIDEO_CONFIGURATION_MISSING';
  readonly message =
    'Twilio video configuration is missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY and TWILIO_API_SECRET.';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
}

export class VideoTokenIssuanceFailedError extends DomainError {
  readonly code = 'VIDEO_TOKEN_ISSUANCE_FAILED';
  readonly message = 'Failed to issue video access token';
  readonly httpStatus = HttpStatus.BAD_GATEWAY;
}

export class VideoRoomOperationFailedError extends DomainError {
  readonly code = 'VIDEO_ROOM_OPERATION_FAILED';
  readonly message = 'Video room operation failed';
  readonly httpStatus = HttpStatus.BAD_GATEWAY;
}
