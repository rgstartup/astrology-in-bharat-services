import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FestivalFacade } from '../../application/festival.facade';
import { CreateFestivalDto, UpdateFestivalDto } from '../dto/festival.dto';
import { Public } from '@/common/decorators/public.decorator';

@Controller('festivals')
export class FestivalController {
  constructor(private readonly festivalFacade: FestivalFacade) {}

  @Public()
  @Get()
  findAll(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.festivalFacade.findAll(Number(year) || undefined, Number(month) || undefined);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.festivalFacade.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateFestivalDto) {
    return this.festivalFacade.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFestivalDto) {
    return this.festivalFacade.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.festivalFacade.remove(+id);
  }
}
