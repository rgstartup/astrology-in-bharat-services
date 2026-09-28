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
import { FestivalService } from '../festival.service';
import { CreateFestivalDto, UpdateFestivalDto } from '../dto/festival.dto';
import { Public } from '@/shared/decorators/public.decorator';

import { GetFestivalsDto } from '../dto/get-festivals.dto';

@Controller('festivals')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) {}

  @Public()
  @Get()
  findAll(@Query() dto: GetFestivalsDto) {
    return this.festivalService.findAll(dto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.festivalService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFestivalDto) {
    return this.festivalService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFestivalDto,
  ) {
    const _result = await this.festivalService.update(id, dto);
    return { success: true };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const _result = await this.festivalService.remove(id);
    return { success: true };
  }
}
