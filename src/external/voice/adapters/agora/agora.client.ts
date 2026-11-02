import { AgoraConfig } from "@/config/agora.config";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AgoraClient {
  private readonly baseUrl = "https://api.agora.io";
  private readonly authorization: string;

  constructor(private readonly config: ConfigService) {
    const agora = this.config.get<AgoraConfig>("agora");

    if (!agora) throw new BadRequestException("Missing agora config");

    const customerId = agora.agoraCustomerId;
    const customerSecret = agora.agoraCustomerSecret;

    const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString(
      "base64",
    );

    this.authorization = `Basic ${credentials}`;
  }

  /**
   * Disbands an Agora RTC channel, kicking every participant out. Used as a
   * server-side fallback to terminate a running communication (e.g. on
   * disconnect or explicit end). One-time kick (`time: 0`) so the channel can
   * be reused later.
   *
   * @param appId - Agora App ID.
   * @param channelName - Channel to disband.
   */
  async disbandChannel(appId: string, channelName: string): Promise<void> {
    await this.request('/dev/v1/kicking-rule', {
      method: 'POST',
      body: JSON.stringify({
        appid: appId,
        cname: channelName,
        ip: '',
        time: 0,
        privileges: ['join_channel'],
      }),
    });
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        `Agora API error (${response.status}): ${JSON.stringify(body)}`,
      );
    }

    return body as T;
  }
}
