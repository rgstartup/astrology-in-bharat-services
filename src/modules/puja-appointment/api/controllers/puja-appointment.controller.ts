import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CreatePujaAppointmentUseCase } from '../../application/use-cases/create-puja-appointment.use-case';
import { CreatePujaAppointmentDto } from '../../application/dtos/create-puja-appointment.dto';
import { GetUserPujaAppointmentsUseCase } from '../../application/use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from '../../application/use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from '../../application/use-cases/update-puja-appointment-status.use-case';
import { UpdatePujaAppointmentStatusDto } from '../../application/dtos/update-puja-appointment-status.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

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
  async createAppointment(@CurrentUser() user: User, @Body() dto: CreatePujaAppointmentDto) {
    return await this.createPujaAppointmentUseCase.execute(user.id, dto);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserAppointments(@CurrentUser() user: User) {
    return await this.getUserPujaAppointmentsUseCase.execute(user.id);
  }

  @Get('expert')
  @UseGuards(JwtAuthGuard)
  async getExpertAppointments(@CurrentUser() user: User) {
    return await this.getExpertPujaAppointmentsUseCase.execute(user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdatePujaAppointmentStatusDto) {
    return await this.updatePujaAppointmentStatusUseCase.execute(Number(id), user.id, dto);
  }
}
