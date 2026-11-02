import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AgoraConfig } from "@/config/agora.config";
import type {
  IVoiceAdapter,
  VoiceTokenOptions,
  VoiceTokenResult,
} from "./voice.types";
import { VOICE_ADAPTER } from "./voice.types";
import { AgoraClient } from "./adapters/agora/agora.client";
import { Logger } from "@nestjs/common";

/**
 * GoF Facade: Voice Service.
 * Consumer-facing entry point for voice capabilities; delegates to the
 * injected IVoiceAdapter so callers never touch a vendor SDK.
 */
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @Inject(VOICE_ADAPTER) private readonly adapter: IVoiceAdapter,
    @Optional() @Inject(ConfigService) private readonly config?: ConfigService,
  ) {}

  /**
   * Issues a voice access token for the given identity.
   */
  generateToken(options: VoiceTokenOptions): Promise<VoiceTokenResult> {
    return this.adapter.generateToken(options);
  }

  /**
   * Disbands (terminates) an Agora RTC channel server-side. No-op when the
   * active provider is not Agora or credentials are missing.
   *
   * @param channelName - Agora channel to terminate.
   */
  async disbandChannel(channelName: string): Promise<void> {
    if (!this.config) return;
    const agora = this.config.get<AgoraConfig>("agora");
    const appId = agora?.agoraAppId ?? this.config.get<string>("AGORA_APP_ID");
    const customerId = agora?.agoraCustomerId;
    const customerSecret = agora?.agoraCustomerSecret;
    if (!appId || !customerId || !customerSecret) return;

    try {
      const client = new AgoraClient(this.config);
      await client.disbandChannel(appId, channelName);
    } catch (error) {
      this.logger.warn(
        `Agora disband failed for channel ${channelName}: ${String(error)}`,
      );
    }
  }
}