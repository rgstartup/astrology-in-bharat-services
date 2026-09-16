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
import { Public } from '@/common/decorators/public.decorator';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { ProfessionFacade } from '../profession.facade';
import {
  GetProfessionsDto,
  SyncExpertProfessionsDto,
} from '../dto/request/profession.dto';

@Controller({
  path: 'professions',
  version: '1',
})
export class ProfessionController {
  constructor(private readonly professionFacade: ProfessionFacade) {}

  @Public()
  @Get()
  async getProfessions(@Query() dto: GetProfessionsDto) {
    return this.professionFacade.getProfessions(dto);
  }

  @Public()
  @Get(':id')
  async getProfessionById(@Param('id', ParseIntPipe) id: number) {
    return this.professionFacade.getProfessionById(id);
  }
}

@Controller({
  path: 'expert/professions',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertProfessionController {
  constructor(private readonly professionFacade: ProfessionFacade) {}

  @Get('me')
  async getMyProfessions(@CurrentExpert() expert: IExpert) {
    return this.professionFacade.getExpertProfessions(expert);
  }

  @Get()
  async getExpertProfessions(@CurrentExpert() expert: IExpert) {
    return this.professionFacade.getExpertProfessions(expert);
  }

  @Put('me')
  async syncMyProfessions(
    @CurrentExpert() expert: IExpert,
    @Body() dto: SyncExpertProfessionsDto,
  ) {
    return this.professionFacade.syncExpertProfessions(expert, dto);
  }

  @Put()
  async syncProfessions(
    @CurrentExpert() expert: IExpert,
    @Body() dto: SyncExpertProfessionsDto,
  ) {
    return this.professionFacade.syncExpertProfessions(expert, dto);
  }
}
