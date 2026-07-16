import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProkeralaCacheEntity } from './entities/prokerala-cache.entity';

export interface ProkeralaPersonParam {
  datetime: string;
  location?: {
    lat: string | number;
    lon: string | number;
    tz: string | number;
  };
  lat?: string | number;
  lon?: string | number;
  tz?: string | number;
}
@Injectable()
export class ProkeralaService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(ProkeralaCacheEntity)
    private readonly cacheRepo: Repository<ProkeralaCacheEntity>,
  ) {}

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
      const error = (await response.json()) as Record<string, unknown>;
      console.error('[ProkeralaService] Auth Error:', error);
      throw new InternalServerErrorException(
        'Failed to authenticate with Prokerala API',
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    if (!this.accessToken) {
      throw new InternalServerErrorException(
        'No access token received from Prokerala API',
      );
    }

    return this.accessToken;
  }

  async getGunaMilan(girl: ProkeralaPersonParam, boy: ProkeralaPersonParam) {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      ayanamsa: '1', // Lahiri
      girl_dob: girl.datetime,
      girl_coordinates: `${girl.location?.lat || girl.lat || ''},${girl.location?.lon || girl.lon || ''}`,
      girl_timezone: (girl.location?.tz || girl.tz || '').toString(),
      boy_dob: boy.datetime,
      boy_coordinates: `${boy.location?.lat || boy.lat || ''},${boy.location?.lon || boy.lon || ''}`,
      boy_timezone: (boy.location?.tz || boy.tz || '').toString(),
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
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `horoscope-${sign}-${lang}-${todayStr}`;

    const cached = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (cached) {
      console.log(`[ProkeralaService] Returning DB cached horoscope for ${cacheKey}`);
      return cached.data;
    }

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
    if (
      lang === 'hi' &&
      result.data &&
      (result.data as Record<string, unknown>).daily_predictions
    ) {
      try {
        const predictions = (
          (result.data as Record<string, unknown>).daily_predictions as Record<
            string,
            unknown
          >[]
        )[0].predictions as Record<string, string>[];
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

    try {
      await this.cacheRepo.save(this.cacheRepo.create({ cacheKey, data: result }));
    } catch (e) {
      console.error(`[ProkeralaService] Failed to save cache for ${cacheKey}`, e);
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
      const json = (await res.json()) as [string[][], ...unknown[]];
      return json[0].map((item: string[]) => item[0]).join('');
    } catch {
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

  async getPanchang(params: {
    datetime: string;
    lat: string;
    lon: string;
    lang?: string;
  }) {
    const dateStr = params.datetime.split('T')[0];
    const cacheKey = `panchang-${dateStr}-${params.lat}-${params.lon}-${params.lang || 'en'}`;
    
    const cached = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (cached) {
      console.log(`[ProkeralaService] Returning DB cached panchang for ${cacheKey}`);
      return cached.data;
    }

    const token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      ayanamsa: '1',
      datetime: params.datetime,
      coordinates: `${params.lat},${params.lon}`,
      la: params.lang || 'en',
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/panchang/advanced?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    const result = await this.handleResponse(response);
    try {
      await this.cacheRepo.save(this.cacheRepo.create({ cacheKey, data: result }));
    } catch (e) {
      console.error(`[ProkeralaService] Failed to save cache for ${cacheKey}`, e);
    }
    return result;
  }

  async getPlanetaryPositions(params: {
    datetime: string;
    lat: string;
    lon: string;
    lang?: string;
  }) {
    const dateStr = params.datetime.split('T')[0];
    const cacheKey = `planets-${dateStr}-${params.lat}-${params.lon}-${params.lang || 'en'}`;
    
    const cached = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (cached) {
      console.log(`[ProkeralaService] Returning DB cached planetary positions for ${cacheKey}`);
      return cached.data;
    }

    const token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      ayanamsa: '1',
      datetime: params.datetime,
      coordinates: `${params.lat},${params.lon}`,
      la: params.lang || 'en',
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/planet-position?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    const result = await this.handleResponse(response);
    try {
      await this.cacheRepo.save(this.cacheRepo.create({ cacheKey, data: result }));
    } catch (e) {
      console.error(`[ProkeralaService] Failed to save cache for ${cacheKey}`, e);
    }
    return result;
  }

  async getKundliMatching(
    girl: ProkeralaPersonParam,
    boy: ProkeralaPersonParam,
    ayanamsa: string = '1',
  ) {
    const token = await this.getAccessToken();

    const girlLat = girl.lat ?? girl.location?.lat;
    const girlLon = girl.lon ?? girl.location?.lon;
    const girlTz = girl.tz ?? girl.location?.tz ?? '5.5';

    const boyLat = boy.lat ?? boy.location?.lat;
    const boyLon = boy.lon ?? boy.location?.lon;
    const boyTz = boy.tz ?? boy.location?.tz ?? '5.5';

    const params = new URLSearchParams({
      ayanamsa,
      girl_dob: girl.datetime,
      girl_coordinates: `${girlLat},${girlLon}`,
      girl_timezone: girlTz.toString(),
      boy_dob: boy.datetime,
      boy_coordinates: `${boyLat},${boyLon}`,
      boy_timezone: boyTz.toString(),
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

  async getPanchangDaily(
    params: {
      datetime: string;
      lat: string;
      lon: string;
      lang?: string;
    },
    retries = 3,
  ): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      ayanamsa: '1',
      datetime: params.datetime,
      coordinates: `${params.lat},${params.lon}`,
      la: params.lang || 'en',
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/panchang/advanced?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    // Retry on 429 Too Many Requests with exponential backoff
    if (response.status === 429 && retries > 0) {
      const waitMs = (4 - retries) * 2000; // 2s, 4s, 6s
      console.warn(
        `[ProkeralaService] Rate limited (429). Retrying in ${waitMs}ms... (${retries} retries left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.getPanchangDaily(params, retries - 1);
    }

    return this.handleResponse(response);
  }

  // Deprecated: Prokerala API v2 does not support a monthly endpoint.
  // Use getPanchangDaily in a loop instead.
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async getPanchangMonthly(params: {
    datetime: string;
    lat: string;
    lon: string;
    lang?: string;
  }) {
    throw new Error(
      'Monthly endpoint not supported by Prokerala v2 API. Use daily loop instead.',
    );
  }

  async getFestivals(year: number, lang?: string) {
    const token = await this.getAccessToken();

    const queryParams = new URLSearchParams({
      year: year.toString(),
      la: lang || 'en',
    });

    const response = await fetch(
      `https://api.prokerala.com/v2/astrology/festivals?${queryParams.toString()}`,
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
      let parsedError: unknown;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        parsedError = errorBody;
      }

      console.error('[ProkeralaService] API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: parsedError,
      });

      throw new InternalServerErrorException(
        `Prokerala API call failed: ${JSON.stringify(parsedError)}`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }
}
