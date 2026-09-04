import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { AstrologyFacade } from '../application/astrology.facade';

// DTO imports
import { GetGunaMilanDto } from './dto/get-guna-milan.dto';
import { GetDailyHoroscopeDto } from './dto/get-daily-horoscope.dto';
import { GetMangalDoshaDto } from './dto/get-mangal-dosha.dto';
import { GetBirthDetailsDto } from './dto/get-birth-details.dto';
import { GetPanchangDto } from './dto/get-panchang.dto';
import { GetPlanetaryPositionsDto } from './dto/get-planetary-positions.dto';
import { GetLuckyStatsDto } from './dto/get-lucky-stats.dto';
import { GetKundliMatchingDto } from './dto/get-kundli-matching.dto';
import { GenerateKundliReportDto } from './dto/generate-kundli-report.dto';

interface AuthenticatedUser {
  profile: string;
}

@Controller('astrology')
export class AstrologyController {
  constructor(private readonly astrologyFacade: AstrologyFacade) {}

  @Get('guna-milan')
  async getGunaMilan(@Query() query: GetGunaMilanDto): Promise<unknown> {
    return this.astrologyFacade.getGunaMilan(query);
  }

  @Get('horoscope-daily')
  async getDailyHoroscope(
    @Query() query: GetDailyHoroscopeDto,
  ): Promise<unknown> {
    return this.astrologyFacade.getDailyHoroscope(query);
  }

  @Get('mangal-dosha')
  async getMangalDosha(@Query() query: GetMangalDoshaDto): Promise<unknown> {
    return this.astrologyFacade.getMangalDosha(query);
  }

  @Get('birth-details')
  async getBirthDetails(@Query() query: GetBirthDetailsDto): Promise<unknown> {
    return this.astrologyFacade.getBirthDetails(query);
  }

  @Get('panchang')
  async getPanchang(@Query() query: GetPanchangDto): Promise<unknown> {
    return this.astrologyFacade.getPanchang(query);
  }

  @Get('planetary-positions')
  async getPlanetaryPositions(
    @Query() query: GetPlanetaryPositionsDto,
  ): Promise<unknown> {
    return this.astrologyFacade.getPlanetaryPositions(query);
  }

  @Get('lucky-stats')
  getLuckyStats(@Query() query: GetLuckyStatsDto) {
    return {
      status: 'ok',
      data: this.astrologyFacade.getLuckyStats(query),
    };
  }

  @Get('kundli-matching')
  async getKundliMatching(
    @Query() query: GetKundliMatchingDto,
  ): Promise<unknown> {
    return this.astrologyFacade.getKundliMatching(query);
  }

  @Post('kundli-reports')
  @UseGuards(JwtAuthGuard)
  async generateAndSaveKundliReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: GenerateKundliReportDto,
  ): Promise<unknown> {
    return this.astrologyFacade.generateAndSaveKundliReport(user.profile, body);
  }

  @Get('my-kundli-reports')
  @UseGuards(JwtAuthGuard)
  async getMyKundliReports(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.astrologyFacade.getMyKundliReports(user.profile);
  }

  @Delete('kundli-reports/:id')
  @UseGuards(JwtAuthGuard)
  async deleteKundliReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.astrologyFacade.deleteKundliReport(user.profile, id);
  }
}
