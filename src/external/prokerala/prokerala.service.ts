import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProkeralaService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(private configService: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = this.configService.get<string>('PROKERALA_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'PROKERALA_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Prokerala API credentials not configured',
      );
    }

    const response = await fetch('https://api.prokerala.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[ProkeralaService] Auth Error:', error);
      throw new InternalServerErrorException(
        'Failed to authenticate with Prokerala API',
      );
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    if (!this.accessToken) {
      throw new InternalServerErrorException(
        'No access token received from Prokerala API',
      );
    }

    return this.accessToken;
  }

  async getGunaMilan(girl: any, boy: any) {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      ayanamsa: '1', // Lahiri
      girl_dob: girl.datetime,
      girl_coordinates: `${girl.location.lat},${girl.location.lon}`,
      girl_timezone: girl.location.tz.toString(),
      boy_dob: boy.datetime,
      boy_coordinates: `${boy.location.lat},${boy.location.lon}`,
      boy_timezone: boy.location.tz.toString(),
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/kundli-matching?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorBody);
      } catch (e) {
        parsedError = errorBody;
      }
      console.error(
        '[ProkeralaService] Prokerala API Full Error:',
        parsedError,
      );
      throw new InternalServerErrorException(
        `Prokerala API call failed: ${JSON.stringify(parsedError)}`,
      );
    }

    return await response.json();
  }
}
