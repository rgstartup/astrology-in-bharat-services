import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import AgoraToken from 'agora-token';
import { AgoraVoiceAdapter } from '../adapters/agora-voice.adapter';
import { TwilioVoiceAdapter } from '../adapters/twilio-voice.adapter';
import { VoiceService } from '../voice.service';
import {
  resolveAgoraVoiceOptions,
  resolveVoiceAdapter,
  resolveVoiceOptions,
  resolveVoiceProvider,
} from '../voice.module';
import type { VoiceModuleOptions } from '../voice.types';
import {
  AgoraVoiceConfigurationMissingError,
  TwilioVoiceConfigurationMissingError,
  VoiceChannelRequiredError,
  VoiceTokenIssuanceFailedError,
} from '../errors/voice.errors';

const validOptions: VoiceModuleOptions = {
  accountSid: 'AC00000000000000000000000000000000',
  authToken: 'auth-token',
  apiKey: 'SK00000000000000000000000000000000',
  apiSecret: 'api-secret',
  voiceApplicationSid: 'AP00000000000000000000000000000000',
  defaultTtlSeconds: 3600,
};

function decodeJwtPayload(token: string): Record<string, any> {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

function fakeConfig(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('Voice Module', () => {
  describe('TwilioVoiceAdapter', () => {
    it('should issue a JWT carrying a VoiceGrant for the identity', async () => {
      const adapter = new TwilioVoiceAdapter(validOptions);
      const result = await adapter.generateToken({ identity: 'client-1' });

      expect(result.identity).toBe('client-1');
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);

      const payload = decodeJwtPayload(result.token);
      expect(payload.grants.identity).toBe('client-1');
      expect(payload.grants.voice).toBeDefined();
      expect(payload.grants.voice.outgoing.application_sid).toBe(
        validOptions.voiceApplicationSid,
      );
      expect(payload.grants.voice.incoming.allow).toBe(true);
    });

    it('should honour a custom ttl and report expiry', async () => {
      const adapter = new TwilioVoiceAdapter(validOptions);
      const before = Date.now();
      const result = await adapter.generateToken({
        identity: 'client-1',
        ttlSeconds: 600,
      });

      const payload = decodeJwtPayload(result.token);
      expect(payload.exp - payload.iat).toBe(600);
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + 600 * 1000,
      );
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 600 * 1000,
      );
    });

    it('should throw configuration error when options are incomplete', () => {
      expect(() => new TwilioVoiceAdapter({} as VoiceModuleOptions)).toThrow(
        TwilioVoiceConfigurationMissingError,
      );
      expect(
        () =>
          new TwilioVoiceAdapter({ ...validOptions, voiceApplicationSid: '' }),
      ).toThrow(TwilioVoiceConfigurationMissingError);
    });

    it('should wrap signing failures in VoiceTokenIssuanceFailedError', async () => {
      const adapter = new TwilioVoiceAdapter(validOptions);
      // Corrupt the secret after construction so signing fails.
      (adapter as unknown as Record<string, unknown>)['apiSecret'] = '';
      await expect(
        adapter.generateToken({ identity: 'client-1' }),
      ).rejects.toThrow(VoiceTokenIssuanceFailedError);
    });
  });

  describe('resolveVoiceOptions (fail fast)', () => {
    it('should resolve options from env', () => {
      const options = resolveVoiceOptions(
        fakeConfig({
          TWILIO_ACCOUNT_SID: 'ACx',
          TWILIO_AUTH_TOKEN: 'tok',
          TWILIO_API_KEY: 'SKx',
          TWILIO_API_SECRET: 'sec',
          TWILIO_VOICE_APP_SID: 'APx',
        }),
      );
      expect(options).toMatchObject({
        accountSid: 'ACx',
        voiceApplicationSid: 'APx',
        defaultTtlSeconds: 3600,
      });
    });

    it('should throw when any required key is missing', () => {
      const base = {
        TWILIO_ACCOUNT_SID: 'ACx',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_API_KEY: 'SKx',
        TWILIO_API_SECRET: 'sec',
        TWILIO_VOICE_APP_SID: 'APx',
      };
      for (const key of Object.keys(base)) {
        const values = { ...base, [key]: undefined };
        expect(() => resolveVoiceOptions(fakeConfig(values))).toThrow(
          TwilioVoiceConfigurationMissingError,
        );
      }
    });
  });

  describe('VoiceService', () => {
    it('should delegate token issuance to the injected adapter', async () => {
      const expected = {
        token: 'jwt',
        identity: 'client-1',
        expiresAt: new Date(),
      };
      let received: unknown;
      const service = new VoiceService({
        generateToken: async (options: unknown) => {
          received = options;
          return expected;
        },
      });

      await expect(
        service.generateToken({ identity: 'client-1' }),
      ).resolves.toBe(expected);
      expect(received).toEqual({ identity: 'client-1' });
    });
  });

  describe('AgoraVoiceAdapter', () => {
    const agoraOptions = {
      appId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      appCertificate: '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
      defaultTtlSeconds: 3600,
      role: AgoraToken.RtcRole.PUBLISHER,
    };

    it('should issue an AccessToken2 RTC token scoped to the channel', async () => {
      const adapter = new AgoraVoiceAdapter(agoraOptions);
      const before = Date.now();
      const result = await adapter.generateToken({
        identity: 'client_10_consult_100',
        channelName: 'consultation:voice:100',
      });

      expect(result.identity).toBe('client_10_consult_100');
      expect(result.channelName).toBe('consultation:voice:100');
      expect(typeof result.token).toBe('string');
      expect(result.token.startsWith('007e')).toBe(true);
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + 3600 * 1000,
      );
    });

    it('should honour a custom ttl and report expiry', async () => {
      const adapter = new AgoraVoiceAdapter(agoraOptions);
      const before = Date.now();
      const result = await adapter.generateToken({
        identity: 'expert_42_consult_100',
        channelName: 'consultation:voice:100',
        ttlSeconds: 600,
      });

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + 600 * 1000,
      );
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 600 * 1000,
      );
    });

    it('should require a channel so both sides cannot drift apart', async () => {
      const adapter = new AgoraVoiceAdapter(agoraOptions);
      await expect(
        adapter.generateToken({ identity: 'client-1' }),
      ).rejects.toThrow(VoiceChannelRequiredError);
    });

    it('should throw configuration error when credentials are missing or malformed', () => {
      expect(
        () => new AgoraVoiceAdapter({ ...agoraOptions, appId: '' }),
      ).toThrow(AgoraVoiceConfigurationMissingError);
      expect(
        () => new AgoraVoiceAdapter({ ...agoraOptions, appCertificate: 'x' }),
      ).toThrow(AgoraVoiceConfigurationMissingError);
      expect(
        () => new AgoraVoiceAdapter({} as typeof agoraOptions),
      ).toThrow(AgoraVoiceConfigurationMissingError);
    });
  });

  describe('resolveVoiceProvider / resolveVoiceAdapter', () => {
    const agoraEnv = {
      AGORA_APP_ID: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      AGORA_APP_CERTIFICATE: '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
    };

    it('should default to agora and build an AgoraVoiceAdapter', () => {
      expect(resolveVoiceProvider(fakeConfig({}))).toBe('agora');
      expect(
        resolveVoiceAdapter(fakeConfig(agoraEnv)),
      ).toBeInstanceOf(AgoraVoiceAdapter);
    });

    it('should resolve agora options with the publisher role', () => {
      const options = resolveAgoraVoiceOptions(fakeConfig(agoraEnv));
      expect(options).toMatchObject({
        appId: agoraEnv.AGORA_APP_ID,
        defaultTtlSeconds: 3600,
        role: AgoraToken.RtcRole.PUBLISHER,
      });
    });

    it('should select twilio only when VOICE_PROVIDER=twilio', () => {
      expect(
        resolveVoiceProvider(fakeConfig({ VOICE_PROVIDER: 'twilio' })),
      ).toBe('twilio');
      expect(
        resolveVoiceAdapter(
          fakeConfig({
            VOICE_PROVIDER: 'twilio',
            TWILIO_ACCOUNT_SID: 'ACx',
            TWILIO_AUTH_TOKEN: 'tok',
            TWILIO_API_KEY: 'SKx',
            TWILIO_API_SECRET: 'sec',
            TWILIO_VOICE_APP_SID: 'APx',
          }),
        ),
      ).toBeInstanceOf(TwilioVoiceAdapter);
    });

    it('should fail fast for the selected provider only', () => {
      // Agora default must not demand Twilio keys.
      expect(() =>
        resolveVoiceAdapter(fakeConfig(agoraEnv)),
      ).not.toThrow();
      // Twilio selection without keys must fail.
      expect(() =>
        resolveVoiceAdapter(fakeConfig({ VOICE_PROVIDER: 'twilio' })),
      ).toThrow(TwilioVoiceConfigurationMissingError);
      // Agora selection without credentials must fail.
      expect(() => resolveVoiceAdapter(fakeConfig({}))).toThrow(
        AgoraVoiceConfigurationMissingError,
      );
    });
  });
});
