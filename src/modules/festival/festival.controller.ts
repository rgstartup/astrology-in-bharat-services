import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Public } from '@/common/interfaces/decorators/public.decorator';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { CreateFestivalDto, UpdateFestivalDto } from './dto/festival.dto';
import { FestivalService } from './festival.service';

@Controller('festivals')
export class FestivalController {
  constructor(private readonly festivalService: FestivalService) { }

  @Public()
  @Get()
  async findAll(@Query('year') year?: number, @Query('month') month?: number) {
    return this.festivalService.findAll(year, month);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.festivalService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() dto: CreateFestivalDto) {
    return this.festivalService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFestivalDto,
  ) {
    return this.festivalService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.festivalService.remove(id);
  }
}
