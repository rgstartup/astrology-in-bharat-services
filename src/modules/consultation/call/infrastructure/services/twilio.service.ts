import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    }
  }

  generateToken(identity: string, type: 'audio' | 'video', room?: string) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const apiKey = this.configService.get<string>('TWILIO_API_KEY');
    const apiSecret = this.configService.get<string>('TWILIO_API_SECRET');

    if (!accountSid || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Twilio configuration missing');
    }

    const AccessToken = twilio.jwt.AccessToken;
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });

    if (type === 'video') {
      const videoGrant = new AccessToken.VideoGrant({ room });
      token.addGrant(videoGrant);
    } else {
      const voiceGrant = new AccessToken.VoiceGrant({
        outgoingApplicationSid: this.configService.get<string>(
          'TWILIO_VOICE_APP_SID',
        ),
        incomingAllow: true,
      });
      token.addGrant(voiceGrant);
    }

    return token.toJwt();
  }
}
