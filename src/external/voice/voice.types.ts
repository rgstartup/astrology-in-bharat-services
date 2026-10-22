export const VOICE_OPTIONS = Symbol('VOICE_OPTIONS');
export const AGORA_VOICE_OPTIONS = Symbol('AGORA_VOICE_OPTIONS');
export const VOICE_ADAPTER = Symbol('VOICE_ADAPTER');

/** Voice token providers selectable through `VOICE_PROVIDER` (default `agora`). */
export type VoiceProvider = 'agora' | 'twilio';

export interface VoiceTokenOptions {
  identity: string;
  /**
   * Media channel both participants must join. Realtime owns channel naming,
   * so callers pass `SOCKET_ROOMS.VOICE_SESSION(consultationId)`. Required by
   * the Agora adapter: a token scoped to the wrong channel silently produces a
   * one-sided call.
   */
  channelName?: string;
  /** Token time-to-live in seconds. Falls back to the module default. */
  ttlSeconds?: number;
}

export interface VoiceTokenResult {
  token: string;
  identity: string;
  /**
   * Agora channel the token is scoped to. Absent for Twilio, whose grant does
   * not bind a channel name.
   */
  channelName?: string;
  expiresAt: Date;
}

export interface VoiceModuleOptions {
  accountSid: string;
  authToken: string;
  apiKey: string;
  apiSecret: string;
  voiceApplicationSid: string;
  defaultTtlSeconds?: number;
}

/**
 * Agora RTC credentials plus defaults used by {@link AgoraVoiceAdapter}.
 *
 * `appId` and `appCertificate` are the 32-character hexadecimal values from
 * Agora Console; the `agora-token` builder silently returns an empty string for
 * anything else, so both are validated at boot and per issuance.
 */
export interface AgoraVoiceModuleOptions {
  /** Agora Console App ID (32-char hex). */
  appId: string;
  /** Agora Console App Certificate (32-char hex), server-side only. */
  appCertificate: string;
  /** Token TTL in seconds applied when a call omits `ttlSeconds`. */
  defaultTtlSeconds: number;
  /** Agora `RtcRole` value; `PUBLISHER` (1) lets both participants publish. */
  role: number;
}

/**
 * GoF Strategy: Voice provider contract.
 * Concrete adapters (Agora, Twilio, ...) implement token issuance behind this interface
 * so VoiceService and consumers never depend on a vendor SDK.
 */
export interface IVoiceAdapter {
  generateToken(options: VoiceTokenOptions): Promise<VoiceTokenResult>;
}
