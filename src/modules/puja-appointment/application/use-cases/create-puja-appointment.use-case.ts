import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PujaAppointment, PujaAppointmentStatus, PujaMode } from '../../infrastructure/entities/puja-appointment.entity';
import { CreatePujaAppointmentDto } from '../dtos/create-puja-appointment.dto';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { ExpertGateway } from '@/modules/expert/profile/api/gateways/expert.gateway';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class CreatePujaAppointmentUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    @InjectRepository(ExpertPuja)
    private expertPujaRepository: Repository<ExpertPuja>,
    @InjectRepository(ProfileExpert)
    private profileExpertRepository: Repository<ProfileExpert>,
    @InjectRepository(ProfileClient)
    private profileClientRepository: Repository<ProfileClient>,
    private notificationFacade: NotificationFacade,
    private expertGateway: ExpertGateway,
  ) {}

  async execute(userId: number, dto: CreatePujaAppointmentDto): Promise<PujaAppointment> {
    const puja = await this.expertPujaRepository.findOne({ 
        where: { id: dto.puja_id },
        relations: ['expert']
    });

    if (!puja) {
      throw new NotFoundException('Puja not found');
    }

    const clientProfile = await this.profileClientRepository.findOne({
      where: { user_id: userId },
      relations: ['user']
    });

    if (!clientProfile) {
      throw new NotFoundException('Client profile not found');
    }

    // --- SECURITY FIX: IGNORE DTO.PRICE (PRICE TAMPERING PROTECTION) ---
    let authoritativePrice = 0;
    if (dto.mode === PujaMode.ONLINE) {
        authoritativePrice = puja.online_cost;
    } else if (dto.mode === PujaMode.HOME_VISIT_WITH) {
        authoritativePrice = puja.home_visit_with_samagri_cost;
    } else if (dto.mode === PujaMode.HOME_VISIT_WITHOUT) {
        authoritativePrice = puja.home_visit_without_samagri_cost;
    }

    // Security Logging: Detect if user tried to manipulate price
    if (dto.price && Number(dto.price) !== authoritativePrice) {
        console.warn(`[SECURITY_ALERT] Potential Price Tampering Attempt. User ${userId} sent price ₹${dto.price} for Puja ${dto.puja_id}, but authoritative price is ₹${authoritativePrice}. Override applied.`);
    }

    const appointment = this.pujaAppointmentRepository.create({
      client_id: clientProfile.id,
      expert_id: puja.expert_id,
      puja_id: dto.puja_id,
      scheduled_date: dto.scheduled_date,
      scheduled_time: dto.scheduled_time,
      ask_expert_for_date: dto.ask_expert_for_date,
      mode: dto.mode,
      price: authoritativePrice, // Forced authoritative price
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

            // Real-time socket notification
            this.expertGateway.notifyNewPujaBooking(expertProfile.user_id, {
                ...saved,
                user: clientProfile.user,
                puja: puja
            });
        } catch (error) {
            console.error('Failed to send notification to expert:', error);
            // Non-blocking error
        }
    }

    return saved;
  }
}
