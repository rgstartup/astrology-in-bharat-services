import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SerperService {
  constructor(private configService: ConfigService) {}

  async fetchPlaces(query: string, location: string = 'India') {
    const apiKey =
      this.configService.get<string>('SERPER_API_KEY') ||
      'd8af18e43b74b92ebc1bd50f76849a84241133e7';
    try {
      // Serper /places does not support a 'location' field — append it to query
      const fullQuery = location && location !== 'India'
        ? `${query} in ${location}`
        : query;

      const requestBody = {
        q: fullQuery,
        gl: 'in',
        hl: 'en',
      };

      const response = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If no credits, return empty gracefully instead of crashing
        if (response.status === 400 && errorText.includes('Not enough credits')) {
          return { places: [] };
        }
        throw new Error(`Serper API error: ${response.statusText} - ${errorText}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async fetchImages(query: string) {
    const apiKey =
      this.configService.get<string>('SERPER_API_KEY') ||
      'd8af18e43b74b92ebc1bd50f76849a84241133e7';
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

      return (await response.json()) as Record<string, unknown>;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(errorMessage);
    }
  }
}
