import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '@/shared/decorators/public.decorator';
import { CurrentExpert } from '@/internal/domains/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/shared/types/access-token.payload';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { ProfessionService } from '../profession.service';
import {
  GetProfessionsDto,
  SyncExpertProfessionsDto,
} from '../dto/request/profession.dto';

@Controller({
  path: 'professions',
  version: '1',
})
export class ProfessionController {
  constructor(private readonly professionService: ProfessionService) {}

  @Public()
  @Get()
  async getProfessions(@Query() dto: GetProfessionsDto) {
    return this.professionService.getProfessions(dto);
  }

  @Public()
  @Get(':id')
  async getProfessionById(@Param('id', ParseIntPipe) id: number) {
    return this.professionService.getProfessionById(id);
  }
}

@Controller({
  path: 'expert/professions',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertProfessionController {
  constructor(private readonly professionService: ProfessionService) {}

  @Get('me')
  async getMyProfessions(@CurrentExpert() expert: IExpert) {
    return this.professionService.getExpertProfessions(expert);
  }

  @Get()
  async getExpertProfessions(@CurrentExpert() expert: IExpert) {
    return this.professionService.getExpertProfessions(expert);
  }

  @Put('me')
  async syncMyProfessions(
    @CurrentExpert() expert: IExpert,
    @Body() dto: SyncExpertProfessionsDto,
  ) {
    return this.professionService.syncExpertProfessions(expert, dto);
  }

  @Put()
  async syncProfessions(
    @CurrentExpert() expert: IExpert,
    @Body() dto: SyncExpertProfessionsDto,
  ) {
    return this.professionService.syncExpertProfessions(expert, dto);
  }
}
