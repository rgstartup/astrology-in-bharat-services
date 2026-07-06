import { Controller, Get, Post, Query, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
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

  @Post('kundli-reports')
  @UseGuards(JwtAuthGuard)
  async generateAndSaveKundliReport(
    @CurrentUser() user: any,
    @Body('girl_dob') girl_dob: string,
    @Body('girl_lat') girl_lat: string,
    @Body('girl_lon') girl_lon: string,
    @Body('girl_tz') girl_tz: string,
    @Body('girl_name') girl_name: string,
    @Body('girl_place') girl_place: string,
    @Body('boy_dob') boy_dob: string,
    @Body('boy_lat') boy_lat: string,
    @Body('boy_lon') boy_lon: string,
    @Body('boy_tz') boy_tz: string,
    @Body('boy_name') boy_name: string,
    @Body('boy_place') boy_place: string,
    @Body('ayanamsa') ayanamsa?: string,
  ) {
    return this.astrologyFacade.generateAndSaveKundliReport(
      user.profile,
      { datetime: girl_dob, lat: girl_lat, lon: girl_lon, tz: girl_tz, name: girl_name, place: girl_place },
      { datetime: boy_dob, lat: boy_lat, lon: boy_lon, tz: boy_tz, name: boy_name, place: boy_place },
      ayanamsa,
    );
  }

  @Get('my-kundli-reports')
  @UseGuards(JwtAuthGuard)
  async getMyKundliReports(@CurrentUser() user: any) {
    return this.astrologyFacade.getMyKundliReports(user.profile);
  }

  @Delete('kundli-reports/:id')
  @UseGuards(JwtAuthGuard)
  async deleteKundliReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.astrologyFacade.deleteKundliReport(user.profile, id);
  }
}
