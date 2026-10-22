import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import AgoraToken from 'agora-token';
import type {
  AgoraVoiceModuleOptions,
  IVoiceAdapter,
  VoiceModuleOptions,
  VoiceProvider,
} from './voice.types';
import { VOICE_ADAPTER } from './voice.types';
import {
  TwilioVoiceConfigurationMissingError,
} from './errors/voice.errors';
import { AgoraVoiceAdapter } from './adapters/agora-voice.adapter';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { VoiceService } from './voice.service';

const DEFAULT_VOICE_TOKEN_TTL_SECONDS = 3600;
const TWILIO_PROVIDER: VoiceProvider = 'twilio';

/**
 * Reads Agora voice configuration from the environment.
 *
 * Credentials are validated by the adapter's constructor so that only the
 * selected provider can fail the boot — an unset Twilio key must not stop an
 * Agora deployment from starting, and vice versa.
 *
 * @param config - Nest configuration service backed by the environment.
 * @returns Agora credentials plus the default TTL and publisher role.
 */
export function resolveAgoraVoiceOptions(
  config: ConfigService,
): AgoraVoiceModuleOptions {
  return {
    appId: config.get<string>('AGORA_APP_ID') || '',
    appCertificate: config.get<string>('AGORA_APP_CERTIFICATE') || '',
    defaultTtlSeconds: DEFAULT_VOICE_TOKEN_TTL_SECONDS,
    // Both participants must publish: this is a two-way voice consultation.
    role: AgoraToken.RtcRole.PUBLISHER,
  };
}

/**
 * Selects the voice token provider.
 *
 * @param config - Nest configuration service backed by the environment.
 * @returns `twilio` only when `VOICE_PROVIDER=twilio`; Agora is the default.
 */
export function resolveVoiceProvider(config: ConfigService): VoiceProvider {
  const configured = (config.get<string>('VOICE_PROVIDER') ?? '').toLowerCase();
  return configured === TWILIO_PROVIDER ? TWILIO_PROVIDER : 'agora';
}

/**
 * Builds the adapter for the selected provider, resolving that provider's
 * options only. Fail-fast validation therefore applies to the active provider
 * and never to credentials the deployment is not using.
 *
 * @param config - Nest configuration service backed by the environment.
 * @returns The adapter backing `VoiceService`.
 * @throws AgoraVoiceConfigurationMissingError when `AGORA_APP_ID` or
 * `AGORA_APP_CERTIFICATE` is absent or malformed under the default provider.
 * @throws TwilioVoiceConfigurationMissingError when `VOICE_PROVIDER=twilio`
 * and any Twilio key is unset.
 */
export function resolveVoiceAdapter(config: ConfigService): IVoiceAdapter {
  if (resolveVoiceProvider(config) === TWILIO_PROVIDER) {
    return new TwilioVoiceAdapter(resolveVoiceOptions(config));
  }
  return new AgoraVoiceAdapter(resolveAgoraVoiceOptions(config));
}

/**
 * Reads Twilio voice config from the environment and fails fast when any
 * required key is missing, so misconfiguration surfaces at boot, not at call time.
 */
export function resolveVoiceOptions(config: ConfigService): VoiceModuleOptions {
  const options: VoiceModuleOptions = {
    accountSid: config.get<string>('TWILIO_ACCOUNT_SID') || '',
    authToken: config.get<string>('TWILIO_AUTH_TOKEN') || '',
    apiKey: config.get<string>('TWILIO_API_KEY') || '',
    apiSecret: config.get<string>('TWILIO_API_SECRET') || '',
    voiceApplicationSid: config.get<string>('TWILIO_VOICE_APP_SID') || '',
    defaultTtlSeconds: DEFAULT_VOICE_TOKEN_TTL_SECONDS,
  };
  if (
    !options.accountSid ||
    !options.authToken ||
    !options.apiKey ||
    !options.apiSecret ||
    !options.voiceApplicationSid
  ) {
    throw new TwilioVoiceConfigurationMissingError();
  }
  return options;
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: VOICE_ADAPTER,
      useFactory: resolveVoiceAdapter,
      inject: [ConfigService],
    },
    VoiceService,
  ],
  exports: [VoiceService, VOICE_ADAPTER],
})
export class VoiceModule {}
