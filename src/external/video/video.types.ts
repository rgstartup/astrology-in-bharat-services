export const VIDEO_OPTIONS = Symbol('VIDEO_OPTIONS');
export const VIDEO_ADAPTER = Symbol('VIDEO_ADAPTER');

export interface VideoTokenOptions {
  identity: string;
  /** Scopes the token to a single room when provided. */
  room?: string;
  /** Token time-to-live in seconds. Falls back to the module default. */
  ttlSeconds?: number;
}

export interface VideoTokenResult {
  token: string;
  identity: string;
  room?: string;
  expiresAt: Date;
}

export interface VideoRoomOptions {
  uniqueName: string;
  type?: 'go' | 'peer-to-peer' | 'group' | 'group-small';
  maxParticipants?: number;
}

export interface VideoRoomResult {
  sid: string;
  uniqueName: string;
  status: string;
  type?: string;
  maxParticipants?: number;
}

export interface VideoModuleOptions {
  accountSid: string;
  authToken: string;
  apiKey: string;
  apiSecret: string;
  defaultTtlSeconds?: number;
}

/**
 * GoF Strategy: Video provider contract.
 * Concrete adapters (Twilio, ...) implement token issuance and room lifecycle
 * behind this interface so VideoService and consumers never depend on a vendor SDK.
 */
export interface IVideoAdapter {
  generateToken(options: VideoTokenOptions): Promise<VideoTokenResult>;
  createRoom(options: VideoRoomOptions): Promise<VideoRoomResult>;
  completeRoom(roomSid: string): Promise<VideoRoomResult>;
  fetchRoom(roomSid: string): Promise<VideoRoomResult>;
}
