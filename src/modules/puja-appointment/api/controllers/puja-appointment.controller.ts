import { Controller, Post, Get, Body, Param, UseGuards, Patch, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
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
    private readonly userRepository: UserRepository,
  ) {}

  private async resolveUserId(betterAuthId: string): Promise<number> {
    const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
    if (!localUser) throw new NotFoundException('User not found');
    return localUser.id;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createAppointment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePujaAppointmentDto) {
    const userId = await this.resolveUserId(user.id);
    return this.createPujaAppointmentUseCase.execute(userId, dto);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserAppointments(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.getUserPujaAppointmentsUseCase.execute(userId);
  }

  @Get('expert')
  @UseGuards(JwtAuthGuard)
  async getExpertAppointments(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.getExpertPujaAppointmentsUseCase.execute(userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePujaAppointmentStatusDto) {
    const userId = await this.resolveUserId(user.id);
    return this.updatePujaAppointmentStatusUseCase.execute(Number(id), userId, dto);
  }
}
