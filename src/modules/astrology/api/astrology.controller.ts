import { Controller, Get, Query } from '@nestjs/common';
import { AstrologyFacade } from '../application/astrology.facade';

@Controller('astrology')
export class AstrologyController {
  constructor(private readonly astrologyFacade: AstrologyFacade) {}

  @Get('guna-milan')
  async getGunaMilan(
    @Query('girl_dob') girl_dob: string,
    @Query('girl_lat') girl_lat: string,
    @Query('girl_lon') girl_lon: string,
    @Query('girl_tz') girl_tz: string,
    @Query('boy_dob') boy_dob: string,
    @Query('boy_lat') boy_lat: string,
    @Query('boy_lon') boy_lon: string,
    @Query('boy_tz') boy_tz: string,
  ) {
    return this.astrologyFacade.getGunaMilan(
      {
        datetime: girl_dob,
        location: { lat: girl_lat, lon: girl_lon, tz: girl_tz },
      },
      {
        datetime: boy_dob,
        location: { lat: boy_lat, lon: boy_lon, tz: boy_tz },
      },
    );
  }

  @Get('horoscope-daily')
  async getDailyHoroscope(
    @Query('sign') sign: string,
    @Query('lang') lang?: string,
  ) {
    return this.astrologyFacade.getDailyHoroscope(sign, lang);
  }

  @Get('mangal-dosha')
  async getMangalDosha(
    @Query('datetime') datetime: string,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('lang') lang?: string,
  ) {
    return this.astrologyFacade.getMangalDosha({ datetime, lat, lon, lang });
  }

  @Get('birth-details')
  async getBirthDetails(
    @Query('datetime') datetime: string,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('ayanamsa') ayanamsa?: string,
  ) {
    return this.astrologyFacade.getBirthDetails({
      datetime,
      lat,
      lon,
      ayanamsa,
    });
  }

  @Get('panchang')
  async getPanchang(
    @Query('datetime') datetime: string,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('lang') lang?: string,
  ) {
    return this.astrologyFacade.getPanchang({ datetime, lat, lon, lang });
  }

  @Get('planetary-positions')
  async getPlanetaryPositions(
    @Query('datetime') datetime: string,
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('lang') lang?: string,
  ) {
    return this.astrologyFacade.getPlanetaryPositions({ datetime, lat, lon, lang });
  }

  @Get('lucky-stats')
  getLuckyStats(
    @Query('sign') sign: string,
    @Query('date') dateStr: string,
  ) {
    return {
      status: 'ok',
      data: this.astrologyFacade.getLuckyStats(sign, dateStr)
    };
  }

  @Get('kundli-matching')
  async getKundliMatching(
    @Query('girl_dob') girl_dob: string,
    @Query('girl_lat') girl_lat: string,
    @Query('girl_lon') girl_lon: string,
    @Query('girl_tz') girl_tz: string,
    @Query('boy_dob') boy_dob: string,
    @Query('boy_lat') boy_lat: string,
    @Query('boy_lon') boy_lon: string,
    @Query('boy_tz') boy_tz: string,
    @Query('ayanamsa') ayanamsa?: string,
  ) {
    return this.astrologyFacade.getKundliMatching(
      { datetime: girl_dob, lat: girl_lat, lon: girl_lon, tz: girl_tz },
      { datetime: boy_dob, lat: boy_lat, lon: boy_lon, tz: boy_tz },
      ayanamsa,
    );
  }
}
