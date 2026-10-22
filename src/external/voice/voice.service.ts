import { Inject, Injectable } from '@nestjs/common';
import type {
  IVoiceAdapter,
  VoiceTokenOptions,
  VoiceTokenResult,
} from './voice.types';
import { VOICE_ADAPTER } from './voice.types';

/**
 * GoF Facade: Voice Service.
 * Consumer-facing entry point for voice capabilities; delegates to the
 * injected IVoiceAdapter so callers never touch a vendor SDK.
 */
@Injectable()
export class VoiceService {
  constructor(@Inject(VOICE_ADAPTER) private readonly adapter: IVoiceAdapter) {}

  /**
   * Issues a voice access token for the given identity.
   */
  generateToken(options: VoiceTokenOptions): Promise<VoiceTokenResult> {
    return this.adapter.generateToken(options);
  }
}
