import { Inject, Injectable, Logger } from '@nestjs/common';
import AgoraToken from 'agora-token';
import type {
  AgoraVoiceModuleOptions,
  IVoiceAdapter,
  VoiceTokenOptions,
  VoiceTokenResult,
} from '../voice.types';
import { AGORA_VOICE_OPTIONS } from '../voice.types';
import {
  AgoraVoiceConfigurationMissingError,
  VoiceChannelRequiredError,
  VoiceTokenIssuanceFailedError,
} from '../errors/voice.errors';

/** Agora App ID and App Certificate are both exactly 32 hex characters. */
const AGORA_CREDENTIAL_PATTERN = /^[0-9a-fA-F]{32}$/;

/**
 * Agora treats uid `0` as "do not authenticate the user ID": any uid may join
 * the channel bound by the token. This matches the client RTC layer, which
 * joins with a null uid and lets the SDK assign one.
 */
const AGORA_ANY_UID = 0;

interface AgoraRtcTokenBuilderShape {
  buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    privilegeExpireTs: number,
    tokenExpire: number,
  ): string;
}

/**
 * Resolves the `RtcTokenBuilder` from the CJS `agora-token` export shape in a
 * bundler-safe way (default-import access covers both `module.exports` and
 * `default`-wrapped interop; static named imports go `undefined` under
 * webpack with `module: esnext`).
 *
 * @returns The RTC token builder.
 * @throws VoiceTokenIssuanceFailedError when the builder cannot be resolved.
 */
function resolveRtcTokenBuilder(): AgoraRtcTokenBuilderShape {
  const moduleShape = AgoraToken as unknown as {
    RtcTokenBuilder?: AgoraRtcTokenBuilderShape;
    default?: { RtcTokenBuilder?: AgoraRtcTokenBuilderShape };
  };
  const builder = moduleShape.RtcTokenBuilder ?? moduleShape.default?.RtcTokenBuilder;
  if (!builder) {
    throw new VoiceTokenIssuanceFailedError();
  }
  return builder;
}

/**
 * Agora RTC voice adapter.
 *
 * Mints AccessToken2 RTC tokens with `agora-token`, scoped to the realtime
 * voice channel passed by the caller (`SOCKET_ROOMS.VOICE_SESSION`) and granted
 * `PUBLISHER` so both the client and the expert can speak.
 *
 * Signing is local and synchronous: every failure here is a code or
 * configuration bug, surfaced as a domain error rather than a transient.
 */
@Injectable()
export class AgoraVoiceAdapter implements IVoiceAdapter {
  private readonly logger = new Logger(AgoraVoiceAdapter.name);
  private readonly appId: string;
  private readonly appCertificate: string;
  private readonly defaultTtlSeconds: number;
  private readonly role: number;

  /**
   * Creates the adapter, validating credentials eagerly so a misconfigured
   * environment fails at boot instead of minting unusable tokens at call time.
   *
   * @param options - Agora credentials and token defaults.
   * @throws AgoraVoiceConfigurationMissingError when either credential is
   * absent or not a 32-character hex string.
   */
  constructor(@Inject(AGORA_VOICE_OPTIONS) options: AgoraVoiceModuleOptions) {
    const { appId, appCertificate, defaultTtlSeconds, role } =
      options ?? ({} as AgoraVoiceModuleOptions);
    if (
      !appId ||
      !appCertificate ||
      !AGORA_CREDENTIAL_PATTERN.test(appId) ||
      !AGORA_CREDENTIAL_PATTERN.test(appCertificate)
    ) {
      throw new AgoraVoiceConfigurationMissingError();
    }
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.defaultTtlSeconds = defaultTtlSeconds ?? 3600;
    this.role = role;
  }

  /**
   * Issues an Agora RTC token for one participant of a voice consultation.
   *
   * @param options - Identity, the shared channel name, and optional TTL.
   * @returns The minted token, the channel it is scoped to, and its expiry.
   * @throws VoiceChannelRequiredError when no channel name is supplied.
   * @throws VoiceTokenIssuanceFailedError when signing fails or returns an
   * empty token (the underlying builder returns `''` instead of throwing when
   * credentials are malformed).
   */
  async generateToken(options: VoiceTokenOptions): Promise<VoiceTokenResult> {
    const { channelName, identity } = options;
    if (!channelName) {
      throw new VoiceChannelRequiredError();
    }
    const ttl = options.ttlSeconds ?? this.defaultTtlSeconds;

    let token: string;
    try {
      token = resolveRtcTokenBuilder().buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channelName,
        AGORA_ANY_UID,
        this.role,
        ttl,
        ttl,
      );
    } catch (error) {
      this.logger.error(
        `Agora token signing failed for channel ${channelName}`,
        error,
      );
      throw new VoiceTokenIssuanceFailedError();
    }

    // `agora-token` returns '' on invalid credentials instead of throwing.
    if (!token) {
      this.logger.error(
        `Agora returned an empty token for channel ${channelName}; check AGORA_APP_ID / AGORA_APP_CERTIFICATE.`,
      );
      throw new VoiceTokenIssuanceFailedError();
    }

    return {
      token,
      identity,
      channelName,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }
}
