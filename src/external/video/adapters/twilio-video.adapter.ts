import { Inject, Injectable } from '@nestjs/common';
import twilio from 'twilio';
import type {
  IVideoAdapter,
  VideoModuleOptions,
  VideoRoomOptions,
  VideoRoomResult,
  VideoTokenOptions,
  VideoTokenResult,
} from '../video.types';
import { VIDEO_OPTIONS } from '../video.types';
import {
  TwilioVideoConfigurationMissingError,
  VideoRoomOperationFailedError,
  VideoTokenIssuanceFailedError,
} from '../errors/video.errors';

interface TwilioRoomShape {
  sid: string;
  uniqueName: string;
  status: string;
  type?: string;
  maxParticipants?: number;
}

/**
 * Twilio Programmable Video adapter.
 * Issues AccessTokens carrying a VideoGrant and manages room lifecycle
 * (create / complete / fetch) through the Twilio REST API.
 *
 * @deprecated Twilio video stack (BE-13). Voice moved to Agora via
 * `external/voice`; video will follow the same provider pattern.
 */
@Injectable()
export class TwilioVideoAdapter implements IVideoAdapter {
  private readonly client: twilio.Twilio;
  private readonly accountSid: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly defaultTtlSeconds: number;

  constructor(@Inject(VIDEO_OPTIONS) options: VideoModuleOptions) {
    const { accountSid, authToken, apiKey, apiSecret } =
      options ?? ({} as VideoModuleOptions);
    if (!accountSid || !authToken || !apiKey || !apiSecret) {
      throw new TwilioVideoConfigurationMissingError();
    }
    this.accountSid = accountSid;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 3600;
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Issues a Twilio AccessToken with a VideoGrant, optionally scoped to a room.
   */
  async generateToken(options: VideoTokenOptions): Promise<VideoTokenResult> {
    try {
      const ttl = options.ttlSeconds ?? this.defaultTtlSeconds;
      const AccessToken = twilio.jwt.AccessToken;
      const token = new AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        { identity: options.identity, ttl },
      );
      token.addGrant(new AccessToken.VideoGrant({ room: options.room }));
      return {
        token: token.toJwt(),
        identity: options.identity,
        room: options.room,
        expiresAt: new Date(Date.now() + ttl * 1000),
      };
    } catch {
      throw new VideoTokenIssuanceFailedError();
    }
  }

  /**
   * Creates a Twilio Video room for a consultation session.
   */
  async createRoom(options: VideoRoomOptions): Promise<VideoRoomResult> {
    try {
      const room = await this.client.video.v1.rooms.create({
        uniqueName: options.uniqueName,
        ...(options.type ? { type: options.type } : {}),
        ...(options.maxParticipants
          ? { maxParticipants: options.maxParticipants }
          : {}),
      });
      return this.mapRoom(room as unknown as TwilioRoomShape);
    } catch {
      throw new VideoRoomOperationFailedError();
    }
  }

  /**
   * Completes a Twilio Video room, disconnecting all participants.
   */
  async completeRoom(roomSid: string): Promise<VideoRoomResult> {
    try {
      const room = await this.client.video.v1
        .rooms(roomSid)
        .update({ status: 'completed' });
      return this.mapRoom(room as unknown as TwilioRoomShape);
    } catch {
      throw new VideoRoomOperationFailedError();
    }
  }

  /**
   * Fetches the current state of a Twilio Video room.
   */
  async fetchRoom(roomSid: string): Promise<VideoRoomResult> {
    try {
      const room = await this.client.video.v1.rooms(roomSid).fetch();
      return this.mapRoom(room as unknown as TwilioRoomShape);
    } catch {
      throw new VideoRoomOperationFailedError();
    }
  }

  private mapRoom(room: TwilioRoomShape): VideoRoomResult {
    return {
      sid: room.sid,
      uniqueName: room.uniqueName,
      status: String(room.status),
      ...(room.type ? { type: room.type } : {}),
      ...(room.maxParticipants !== undefined
        ? { maxParticipants: room.maxParticipants }
        : {}),
    };
  }
}
