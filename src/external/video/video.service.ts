import { Inject, Injectable } from '@nestjs/common';
import type {
  IVideoAdapter,
  VideoRoomOptions,
  VideoRoomResult,
  VideoTokenOptions,
  VideoTokenResult,
} from './video.types';
import { VIDEO_ADAPTER } from './video.types';

/**
 * GoF Facade: Video Service.
 * Consumer-facing entry point for video capabilities; delegates to the
 * injected IVideoAdapter so callers never touch a vendor SDK.
 *
 * @deprecated Twilio video stack (BE-13). Voice moved to `VoiceService`
 * (Agora by default). Do not add new callers.
 */
@Injectable()
export class VideoService {
  constructor(@Inject(VIDEO_ADAPTER) private readonly adapter: IVideoAdapter) {}

  /**
   * Issues a video access token for the given identity, optionally scoped to a room.
   */
  generateToken(options: VideoTokenOptions): Promise<VideoTokenResult> {
    return this.adapter.generateToken(options);
  }

  /**
   * Creates a video room for a consultation session.
   */
  createRoom(options: VideoRoomOptions): Promise<VideoRoomResult> {
    return this.adapter.createRoom(options);
  }

  /**
   * Completes a video room, disconnecting all participants.
   */
  completeRoom(roomSid: string): Promise<VideoRoomResult> {
    return this.adapter.completeRoom(roomSid);
  }

  /**
   * Fetches the current state of a video room.
   */
  fetchRoom(roomSid: string): Promise<VideoRoomResult> {
    return this.adapter.fetchRoom(roomSid);
  }
}
