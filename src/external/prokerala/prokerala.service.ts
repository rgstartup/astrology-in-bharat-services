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

    return this.handleResponse(response);
  }

  async getDailyHoroscope(sign: string, lang: string = 'en') {
    const token = await this.getAccessToken();
    const today = new Date().toISOString();

    const response = await fetch(
      `https://api.prokerala.com/v2/horoscope/daily/advanced?sign=${sign}&datetime=${today}&type=all&lang=${lang}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    const result = await this.handleResponse(response);

    // Prokerala advanced doesn't return Hindi text for advanced daily horoscope.
    if (lang === 'hi' && result.data && result.data.daily_predictions) {
      try {
        const predictions = result.data.daily_predictions[0].predictions;
        for (let i = 0; i < predictions.length; i++) {
          predictions[i].prediction = await this.translateText(
            predictions[i].prediction,
          );
          if (predictions[i].seek)
            predictions[i].seek = await this.translateText(predictions[i].seek);
          if (predictions[i].challenge)
            predictions[i].challenge = await this.translateText(
              predictions[i].challenge,
            );
          if (predictions[i].insight)
            predictions[i].insight = await this.translateText(
              predictions[i].insight,
            );
        }
      } catch (translateError) {
        console.error(
          '[ProkeralaService] Translation failed, falling back to English:',
          translateError,
        );
      }
    }

    return result;
  }

  private async translateText(text: string): Promise<string> {
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(
          text,
        )}`,
      );
      if (!res.ok) return text;
      const json = await res.json();
      return json[0].map((item: any) => item[0]).join('');
    } catch (e) {
      return text;
    }
  }


  async getMangalDosha(params: {
    datetime: string;
    lat: string;
    lon: string;
    lang?: string;
  }) {
    const token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      ayanamsa: '1',
      datetime: params.datetime,
      coordinates: `${params.lat},${params.lon}`,
      la: params.lang || 'en',
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/mangal-dosha/advanced?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    return this.handleResponse(response);
  }

  async getBirthDetails(params: {
    datetime: string;
    lat: string;
    lon: string;
    ayanamsa?: string;
  }) {
    const token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      ayanamsa: params.ayanamsa || '1',
      coordinates: `${params.lat},${params.lon}`,
      datetime: params.datetime,
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/birth-details?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    return this.handleResponse(response);
  }

  async getKundliMatching(girl: any, boy: any, ayanamsa: string = '1') {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      ayanamsa,
      girl_dob: girl.datetime,
      girl_coordinates: `${girl.lat},${girl.lon}`,
      girl_timezone: girl.tz || '5.5',
      boy_dob: boy.datetime,
      boy_coordinates: `${boy.lat},${boy.lon}`,
      boy_timezone: boy.tz || '5.5',
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/kundli-matching/advanced?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    return this.handleResponse(response);
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorBody = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorBody);
      } catch (e) {
        parsedError = errorBody;
      }
      console.error('[ProkeralaService] API Error:', parsedError);
      throw new InternalServerErrorException(
        `Prokerala API call failed: ${JSON.stringify(parsedError)}`,
      );
    }
    return await response.json();
  }
}

