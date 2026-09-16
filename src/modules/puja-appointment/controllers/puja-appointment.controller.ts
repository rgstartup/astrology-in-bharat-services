import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CreatePujaAppointmentUseCase } from '../use-cases/create-puja-appointment.use-case';
import { CreatePujaAppointmentDto } from '../dtos/create-puja-appointment.dto';
import { GetUserPujaAppointmentsUseCase } from '../use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from '../use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from '../use-cases/update-puja-appointment-status.use-case';
import { UpdatePujaAppointmentStatusDto } from '../dtos/update-puja-appointment-status.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { IUser } from '@/common/types/access-token.payload';

@Controller('puja-appointments')
export class PujaAppointmentController {
  constructor(
    private readonly createPujaAppointmentUseCase: CreatePujaAppointmentUseCase,
    private readonly getUserPujaAppointmentsUseCase: GetUserPujaAppointmentsUseCase,
    private readonly getExpertPujaAppointmentsUseCase: GetExpertPujaAppointmentsUseCase,
    private readonly updatePujaAppointmentStatusUseCase: UpdatePujaAppointmentStatusUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createAppointment(
    @CurrentUser() user: IUser,
    @Body() dto: CreatePujaAppointmentDto,
  ) {
    return await this.createPujaAppointmentUseCase.execute(user, dto);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserAppointments(@CurrentProfile() profileId: number) {
    return await this.getUserPujaAppointmentsUseCase.execute(profileId);
  }

  @Get('expert')
  @UseGuards(JwtAuthGuard)
  async getExpertAppointments(@CurrentProfile() profileId: number) {
    return await this.getExpertPujaAppointmentsUseCase.execute(profileId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePujaAppointmentStatusDto,
  ) {
    const _result = await this.updatePujaAppointmentStatusUseCase.execute(
      id,
      profileId,
      dto,
    );
    return { success: true };
  }
}
