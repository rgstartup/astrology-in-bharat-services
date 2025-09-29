import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ExpertService } from './expert.service';
import { CreateExpertDto } from './dto/create-expert.dto';
import { UpdateExpertDto } from './dto/update-expert.dto';
import { Session, UserSession } from '@thallesp/nestjs-better-auth';

@Controller('expert')
export class ExpertController {
  constructor(private readonly expertService: ExpertService) {}

  @Post()
  create(
    @Session() session: UserSession,
    @Body() createExpertDto: CreateExpertDto,
  ) {
    return this.expertService.create(session.user.id, createExpertDto);
  }

  @Get()
  findAll() {
    return this.expertService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expertService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpertDto: UpdateExpertDto) {
    return this.expertService.update(+id, updateExpertDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expertService.remove(+id);
  }
}
