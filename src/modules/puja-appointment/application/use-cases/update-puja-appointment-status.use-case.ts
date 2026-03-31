import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment, PujaAppointmentStatus } from '../../infrastructure/persistence/entities/puja-appointment.entity';
import { UpdatePujaAppointmentStatusDto } from '../dtos/update-puja-appointment-status.dto';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';

@Injectable()
export class UpdatePujaAppointmentStatusUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    private notificationFacade: NotificationFacade,
  ) {}

  async execute(id: number, expertUserId: number, dto: UpdatePujaAppointmentStatusDto): Promise<PujaAppointment> {
    const appointment = await this.pujaAppointmentRepository.findOne({ 
        where: { id },
        relations: ['expert', 'puja', 'user']
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Security check: Make sure this expert user owns this appointment
    if (appointment.expert.user_id !== expertUserId) {
        throw new NotFoundException('Appointment not found for this expert');
    }

    if (dto.status) appointment.status = dto.status;
    if (dto.expert_message) appointment.expert_message = dto.expert_message;
    if (dto.scheduled_date) appointment.scheduled_date = dto.scheduled_date;
    if (dto.scheduled_time) appointment.scheduled_time = dto.scheduled_time;
    if (dto.price !== undefined) appointment.price = dto.price;

    const saved = await this.pujaAppointmentRepository.save(appointment);

    // Notify User
    let title = 'Puja Request Update';
    let message = `Your request for ${appointment.puja?.name || 'Puja'} has been ${dto.status}.`;
    
    if (dto.status === PujaAppointmentStatus.ON_HOLD) message = `Your request for ${appointment.puja?.name || 'Puja'} is on hold.`;
    if (dto.status === PujaAppointmentStatus.ACCEPTED) title = 'Puja Request Accepted!';

    try {
        await this.notificationFacade.create(
            appointment.user_id,
            NotificationType.GENERAL,
            title,
            message,
            { appointment_id: saved.id, type: 'PUJA_STATUS_UPDATE' }
        );
    } catch (error) {
        console.error('Failed to send status update notification to user:', error);
    }

    return saved;
  }
}
