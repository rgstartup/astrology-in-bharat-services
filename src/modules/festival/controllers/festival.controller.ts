import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FestivalFacade } from '../festival.facade';
import { CreateFestivalDto, UpdateFestivalDto } from '../dto/festival.dto';
import { Public } from '@/common/decorators/public.decorator';

import { GetFestivalsDto } from '../dto/get-festivals.dto';

@Controller('festivals')
export class FestivalController {
  constructor(private readonly festivalFacade: FestivalFacade) {}

  @Public()
  @Get()
  findAll(@Query() dto: GetFestivalsDto) {
    return this.festivalFacade.findAll(dto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.festivalFacade.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFestivalDto) {
    return this.festivalFacade.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFestivalDto,
  ) {
    const _result = await this.festivalFacade.update(id, dto);
    return { success: true };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const _result = await this.festivalFacade.remove(id);
    return { success: true };
  }
}
