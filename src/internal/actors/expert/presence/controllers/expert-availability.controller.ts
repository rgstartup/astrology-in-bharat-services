import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentExpert } from '@/internal/actors/expert/auth/decorators/current-expert.decorator';
import { ExpertJwtAuthGuard } from '@/internal/actors/expert/auth/guards/auth.guard';
import { Public } from '@/shared/decorators/public.decorator';
import { type IExpert } from '@/shared/types/access-token.payload';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';
import { PresenceService } from '../presence.service';

@Controller({ path: 'expert', version: '1' })
export class ExpertAvailabilityController {
  constructor(private readonly presenceService: PresenceService) {}

  @Patch('availability')
  @UseGuards(ExpertJwtAuthGuard)
  async updateAvailability(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const expertId = Number(expert.sub);
    await this.presenceService.setAvailability(expertId, dto.mode);
    const fullStatus = await this.presenceService.getFullStatus(expertId);
    return {
      message: 'Availability updated successfully',
      expertId,
      mode: dto.mode,
      status: fullStatus.status,
      isAvailableForConsultation: fullStatus.isAvailableForConsultation,
    };
  }

  @Get('availability/me')
  @UseGuards(ExpertJwtAuthGuard)
  async getMyAvailability(@CurrentExpert() expert: IExpert) {
    const expertId = Number(expert.sub);
    const fullStatus = await this.presenceService.getFullStatus(expertId);
    return fullStatus;
  }

  @Get('presence/:id')
  @Public()
  async getExpertStatus(@Param('id', ParseIntPipe) id: number) {
    const status = await this.presenceService.getStatus(id);
    return {
      expertId: id,
      status,
      isAvailableForConsultation: status === 'online',
    };
  }
}
