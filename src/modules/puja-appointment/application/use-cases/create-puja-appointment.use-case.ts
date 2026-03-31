import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment, PujaAppointmentStatus } from '../../infrastructure/persistence/entities/puja-appointment.entity';
import { CreatePujaAppointmentDto } from '../dtos/create-puja-appointment.dto';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/persistence/entities/expert-puja.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';

@Injectable()
export class CreatePujaAppointmentUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    @InjectRepository(ExpertPuja)
    private expertPujaRepository: Repository<ExpertPuja>,
    @InjectRepository(ProfileExpert)
    private profileExpertRepository: Repository<ProfileExpert>,
    private notificationFacade: NotificationFacade,
  ) {}

  async execute(userId: number, dto: CreatePujaAppointmentDto): Promise<PujaAppointment> {
    const puja = await this.expertPujaRepository.findOne({ 
        where: { id: dto.puja_id },
        relations: ['expert']
    });

    if (!puja) {
      throw new NotFoundException('Puja not found');
    }

    const appointment = this.pujaAppointmentRepository.create({
      user_id: userId,
      expert_id: puja.expert_id,
      puja_id: dto.puja_id,
      scheduled_date: dto.scheduled_date,
      scheduled_time: dto.scheduled_time,
      ask_expert_for_date: dto.ask_expert_for_date,
      mode: dto.mode,
      price: dto.price,
      user_message: dto.user_message,
      status: PujaAppointmentStatus.PENDING,
    });

    const saved = await this.pujaAppointmentRepository.save(appointment);

    // Notify Expert
    const expertProfile = await this.profileExpertRepository.findOne({
        where: { id: puja.expert_id }
    });
    
    if (expertProfile && expertProfile.user_id) {
        try {
            await this.notificationFacade.create(
                expertProfile.user_id,
                NotificationType.PUJA_BOOKING,
                'New Puja Booking Request',
                `You have received a new booking request for ${puja.name}.`,
                { appointment_id: saved.id, type: 'PUJA_BOOKING' }
            );
        } catch (error) {
            console.error('Failed to send notification to expert:', error);
            // Non-blocking error
        }
    }

    return saved;
  }
}
