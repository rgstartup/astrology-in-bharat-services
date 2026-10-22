import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { VideoModuleOptions } from './video.types';
import { VIDEO_ADAPTER, VIDEO_OPTIONS } from './video.types';
import { TwilioVideoConfigurationMissingError } from './errors/video.errors';
import { TwilioVideoAdapter } from './adapters/twilio-video.adapter';
import { VideoService } from './video.service';

const DEFAULT_VIDEO_TOKEN_TTL_SECONDS = 3600;

/**
 * Reads Twilio video config from the environment and fails fast when any
 * required key is missing, so misconfiguration surfaces at boot, not at call time.
 */
export function resolveVideoOptions(config: ConfigService): VideoModuleOptions {
  const options: VideoModuleOptions = {
    accountSid: config.get<string>('TWILIO_ACCOUNT_SID') || '',
    authToken: config.get<string>('TWILIO_AUTH_TOKEN') || '',
    apiKey: config.get<string>('TWILIO_API_KEY') || '',
    apiSecret: config.get<string>('TWILIO_API_SECRET') || '',
    defaultTtlSeconds: DEFAULT_VIDEO_TOKEN_TTL_SECONDS,
  };
  if (
    !options.accountSid ||
    !options.authToken ||
    !options.apiKey ||
    !options.apiSecret
  ) {
    throw new TwilioVideoConfigurationMissingError();
  }
  return options;
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: VIDEO_OPTIONS,
      useFactory: resolveVideoOptions,
      inject: [ConfigService],
    },
    { provide: VIDEO_ADAPTER, useClass: TwilioVideoAdapter },
    VideoService,
  ],
  exports: [VideoService, VIDEO_ADAPTER, VIDEO_OPTIONS],
})
/**
 * @deprecated Twilio video stack. Voice moved to `external/voice`
 * (`VoiceService`, Agora by default); video will follow the same provider
 * pattern. Do not add new callers; removal tracked in
 * `backend/docs/DEPRECATION_INVENTORY.md` (BE-13).
 */
export class VideoModule {
  private readonly logger = new Logger(VideoModule.name);

  constructor() {
    this.logger.warn(
      'VideoModule is deprecated (BE-13) and will be removed; migrate to VoiceService for voice tokens.',
    );
  }
}
