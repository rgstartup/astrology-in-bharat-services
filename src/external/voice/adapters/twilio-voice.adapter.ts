import { Inject, Injectable } from '@nestjs/common';
import twilio from 'twilio';
import type {
  IVoiceAdapter,
  VoiceModuleOptions,
  VoiceTokenOptions,
  VoiceTokenResult,
} from '../voice.types';
import { VOICE_OPTIONS } from '../voice.types';
import {
  TwilioVoiceConfigurationMissingError,
  VoiceTokenIssuanceFailedError,
} from '../errors/voice.errors';

/**
 * Twilio Programmable Voice adapter.
 * Issues AccessTokens carrying a VoiceGrant bound to the TwiML application,
 * and owns the Twilio REST client for future voice lifecycle calls.
 *
 * @deprecated Twilio voice path (BE-02). Agora is the default provider
 * (`VOICE_PROVIDER` unset); this adapter only runs when
 * `VOICE_PROVIDER=twilio`. Do not add new callers.
 */
@Injectable()
export class TwilioVoiceAdapter implements IVoiceAdapter {
  private readonly client: twilio.Twilio;
  private readonly accountSid: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly voiceApplicationSid: string;
  private readonly defaultTtlSeconds: number;

  constructor(@Inject(VOICE_OPTIONS) options: VoiceModuleOptions) {
    const { accountSid, authToken, apiKey, apiSecret, voiceApplicationSid } =
      options ?? ({} as VoiceModuleOptions);
    if (
      !accountSid ||
      !authToken ||
      !apiKey ||
      !apiSecret ||
      !voiceApplicationSid
    ) {
      throw new TwilioVoiceConfigurationMissingError();
    }
    this.accountSid = accountSid;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.voiceApplicationSid = voiceApplicationSid;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 3600;
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Issues a Twilio AccessToken with a VoiceGrant for the given identity.
   */
  async generateToken(options: VoiceTokenOptions): Promise<VoiceTokenResult> {
    try {
      const ttl = options.ttlSeconds ?? this.defaultTtlSeconds;
      const AccessToken = twilio.jwt.AccessToken;
      const token = new AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        { identity: options.identity, ttl },
      );
      token.addGrant(
        new AccessToken.VoiceGrant({
          outgoingApplicationSid: this.voiceApplicationSid,
          incomingAllow: true,
        }),
      );
      return {
        token: token.toJwt(),
        identity: options.identity,
        expiresAt: new Date(Date.now() + ttl * 1000),
      };
    } catch {
      throw new VoiceTokenIssuanceFailedError();
    }
  }
}
