import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SerperService {
  constructor(private configService: ConfigService) {}

  async fetchPlaces(query: string, location: string = 'India') {
    const apiKey = this.configService.get<string>('SERPER_API_KEY') || 'd8af18e43b74b92ebc1bd50f76849a84241133e7';
    try {
      const response = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          location: location,
          gl: 'in',
        }),
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async fetchImages(query: string) {
    const apiKey = this.configService.get<string>('SERPER_API_KEY') || 'd8af18e43b74b92ebc1bd50f76849a84241133e7';
    try {
      const response = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query + ' exterior real photo',
          num: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
