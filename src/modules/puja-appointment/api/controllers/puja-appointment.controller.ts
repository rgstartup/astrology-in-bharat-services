import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CreatePujaAppointmentUseCase } from '../../application/use-cases/create-puja-appointment.use-case';
import { CreatePujaAppointmentDto } from '../../application/dtos/create-puja-appointment.dto';
import { GetUserPujaAppointmentsUseCase } from '../../application/use-cases/get-user-puja-appointments.use-case';
import { GetExpertPujaAppointmentsUseCase } from '../../application/use-cases/get-expert-puja-appointments.use-case';
import { UpdatePujaAppointmentStatusUseCase } from '../../application/use-cases/update-puja-appointment-status.use-case';
import { UpdatePujaAppointmentStatusDto } from '../../application/dtos/update-puja-appointment-status.dto';

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
  async createAppointment(@Request() req: any, @Body() dto: CreatePujaAppointmentDto) {
    return await this.createPujaAppointmentUseCase.execute(req.user.id, dto);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserAppointments(@Request() req: any) {
    return await this.getUserPujaAppointmentsUseCase.execute(req.user.id);
  }

  @Get('expert')
  @UseGuards(JwtAuthGuard)
  async getExpertAppointments(@Request() req: any) {
    return await this.getExpertPujaAppointmentsUseCase.execute(req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePujaAppointmentStatusDto) {
    return await this.updatePujaAppointmentStatusUseCase.execute(Number(id), req.user.id, dto);
  }
}
