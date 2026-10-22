import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { TwilioVideoAdapter } from '../adapters/twilio-video.adapter';
import { VideoService } from '../video.service';
import { resolveVideoOptions } from '../video.module';
import type { IVideoAdapter, VideoModuleOptions } from '../video.types';
import {
  TwilioVideoConfigurationMissingError,
  VideoRoomOperationFailedError,
} from '../errors/video.errors';

const validOptions: VideoModuleOptions = {
  accountSid: 'AC00000000000000000000000000000000',
  authToken: 'auth-token',
  apiKey: 'SK00000000000000000000000000000000',
  apiSecret: 'api-secret',
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

/** Replaces the adapter's REST client with an in-memory fake. */
function withFakeClient(
  adapter: TwilioVideoAdapter,
  rooms: Record<string, any>,
) {
  const roomsFn = ((sid: string) => ({
    update: async (params: Record<string, unknown>) => {
      const room = rooms[sid];
      if (!room) throw new Error('not found');
      return { ...room, ...params };
    },
    fetch: async () => {
      const room = rooms[sid];
      if (!room) throw new Error('not found');
      return room;
    },
  })) as unknown as Record<string, unknown>;
  roomsFn['create'] = async (params: Record<string, unknown>) => ({
    sid: 'RM00000000000000000000000000000000',
    status: 'in-progress',
    type: 'group',
    maxParticipants: 10,
    ...params,
  });
  (adapter as unknown as Record<string, unknown>)['client'] = {
    video: { v1: { rooms: roomsFn } },
  };
}

describe('Video Module', () => {
  describe('TwilioVideoAdapter tokens', () => {
    it('should issue a JWT carrying a room-scoped VideoGrant', async () => {
      const adapter = new TwilioVideoAdapter(validOptions);
      const result = await adapter.generateToken({
        identity: 'expert-1',
        room: 'consult-123',
      });

      expect(result.identity).toBe('expert-1');
      expect(result.room).toBe('consult-123');
      const payload = decodeJwtPayload(result.token);
      expect(payload.grants.identity).toBe('expert-1');
      expect(payload.grants.video).toBeDefined();
      expect(payload.grants.video.room).toBe('consult-123');
    });

    it('should issue an unscoped VideoGrant when no room is given', async () => {
      const adapter = new TwilioVideoAdapter(validOptions);
      const result = await adapter.generateToken({ identity: 'expert-1' });

      const payload = decodeJwtPayload(result.token);
      expect(payload.grants.video).toBeDefined();
      expect(payload.grants.video.room).toBeUndefined();
      expect(result.room).toBeUndefined();
    });

    it('should throw configuration error when options are incomplete', () => {
      expect(() => new TwilioVideoAdapter({} as VideoModuleOptions)).toThrow(
        TwilioVideoConfigurationMissingError,
      );
    });
  });

  describe('TwilioVideoAdapter room lifecycle', () => {
    it('should create a room and map the result', async () => {
      const adapter = new TwilioVideoAdapter(validOptions);
      withFakeClient(adapter, {});

      const room = await adapter.createRoom({
        uniqueName: 'consult-123',
        type: 'group',
        maxParticipants: 2,
      });
      expect(room).toMatchObject({
        sid: 'RM00000000000000000000000000000000',
        uniqueName: 'consult-123',
        status: 'in-progress',
        maxParticipants: 2,
      });
    });

    it('should complete a room', async () => {
      const adapter = new TwilioVideoAdapter(validOptions);
      withFakeClient(adapter, {
        RM1: { sid: 'RM1', uniqueName: 'consult-123', status: 'in-progress' },
      });

      const room = await adapter.completeRoom('RM1');
      expect(room.status).toBe('completed');
      expect(room.sid).toBe('RM1');
    });

    it('should fetch a room', async () => {
      const adapter = new TwilioVideoAdapter(validOptions);
      withFakeClient(adapter, {
        RM1: { sid: 'RM1', uniqueName: 'consult-123', status: 'in-progress' },
      });

      const room = await adapter.fetchRoom('RM1');
      expect(room).toMatchObject({
        sid: 'RM1',
        uniqueName: 'consult-123',
        status: 'in-progress',
      });
    });

    it('should wrap room failures in VideoRoomOperationFailedError', async () => {
      const adapter = new TwilioVideoAdapter(validOptions);
      withFakeClient(adapter, {});

      await expect(adapter.completeRoom('RM-missing')).rejects.toThrow(
        VideoRoomOperationFailedError,
      );
      await expect(adapter.fetchRoom('RM-missing')).rejects.toThrow(
        VideoRoomOperationFailedError,
      );
    });
  });

  describe('resolveVideoOptions (fail fast)', () => {
    it('should resolve options from env', () => {
      const options = resolveVideoOptions(
        fakeConfig({
          TWILIO_ACCOUNT_SID: 'ACx',
          TWILIO_AUTH_TOKEN: 'tok',
          TWILIO_API_KEY: 'SKx',
          TWILIO_API_SECRET: 'sec',
        }),
      );
      expect(options).toMatchObject({
        accountSid: 'ACx',
        defaultTtlSeconds: 3600,
      });
    });

    it('should throw when any required key is missing', () => {
      const base = {
        TWILIO_ACCOUNT_SID: 'ACx',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_API_KEY: 'SKx',
        TWILIO_API_SECRET: 'sec',
      };
      for (const key of Object.keys(base)) {
        const values = { ...base, [key]: undefined };
        expect(() => resolveVideoOptions(fakeConfig(values))).toThrow(
          TwilioVideoConfigurationMissingError,
        );
      }
    });
  });

  describe('VideoService', () => {
    it('should delegate token and room calls to the injected adapter', async () => {
      const calls: Array<{ method: string; args: unknown[] }> = [];
      const service = new VideoService({
        generateToken: async (...args: unknown[]) => {
          calls.push({ method: 'generateToken', args });
          return { token: 'jwt' };
        },
        createRoom: async (...args: unknown[]) => {
          calls.push({ method: 'createRoom', args });
          return { sid: 'RM1' };
        },
        completeRoom: async (...args: unknown[]) => {
          calls.push({ method: 'completeRoom', args });
          return { sid: 'RM1' };
        },
        fetchRoom: async (...args: unknown[]) => {
          calls.push({ method: 'fetchRoom', args });
          return { sid: 'RM1' };
        },
      } as unknown as IVideoAdapter);

      await service.generateToken({ identity: 'a' });
      await service.createRoom({ uniqueName: 'r' });
      await service.completeRoom('RM1');
      await service.fetchRoom('RM1');
      expect(calls.map((c) => c.method)).toEqual([
        'generateToken',
        'createRoom',
        'completeRoom',
        'fetchRoom',
      ]);
    });
  });
});
