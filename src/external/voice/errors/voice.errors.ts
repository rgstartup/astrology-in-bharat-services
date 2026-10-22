import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/shared/types/domain.error';

export class TwilioVoiceConfigurationMissingError extends DomainError {
  readonly code = 'VOICE_CONFIGURATION_MISSING';
  readonly message =
    'Twilio voice configuration is missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_API_SECRET and TWILIO_VOICE_APP_SID.';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
}

export class AgoraVoiceConfigurationMissingError extends DomainError {
  readonly code = 'AGORA_VOICE_CONFIGURATION_MISSING';
  readonly message =
    'Agora voice configuration is missing or invalid. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE to the 32-character hexadecimal values issued by Agora Console.';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
}

export class VoiceChannelRequiredError extends DomainError {
  readonly code = 'VOICE_CHANNEL_REQUIRED';
  readonly message =
    'A voice token was requested without a channel. Pass the consultation channel name so both participants join the same session.';
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
}

export class VoiceTokenIssuanceFailedError extends DomainError {
  readonly code = 'VOICE_TOKEN_ISSUANCE_FAILED';
  readonly message = 'Failed to issue voice access token';
  readonly httpStatus = HttpStatus.BAD_GATEWAY;
}
