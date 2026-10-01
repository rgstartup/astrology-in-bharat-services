import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { RoleEnum } from '../../users/enums/Role.enum';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PujaAppointment,
  PujaAppointmentStatus,
  PujaMode,
} from '../entities/puja-appointment.entity';
import { CreatePujaAppointmentDto } from '../dtos/create-puja-appointment.dto';
import { ExpertProfileService } from '../../actors/expert/profile/profile.service';
import { ClientAccount } from '../../actors/client/account/entities/account.entity';
import { NotificationService } from '../../notification/notification.service';
import { NotificationType } from '../../notification/entities/notification.entity';
import { IUser } from '../../../shared/types/access-token.payload';

@Injectable()
export class CreatePujaAppointmentUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    @InjectRepository(ClientAccount)
    private readonly clientAccountRepo: Repository<ClientAccount>,
    @Inject(forwardRef(() => ExpertProfileService))
    private readonly expertProfileService: DeferredDependency<ExpertProfileService>,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(
    user: IUser,
    dto: CreatePujaAppointmentDto,
  ): Promise<PujaAppointment> {
    const userId = user.id;
    const puja = await this.expertProfileService.getPujaById(dto.puja_id);

    if (!puja) {
      throw new NotFoundException('Puja not found');
    }

    const clientAccountId = user.profile || user.id;

    const clientAccount = await this.clientAccountRepo.findOne({
      where: [{ id: clientAccountId }, { user: { id: clientAccountId } }],
      relations: ['user'],
    });

    if (!clientAccount) {
      throw new NotFoundException('Client account not found');
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
      console.warn(
        `[SECURITY_ALERT] Potential Price Tampering Attempt. User ${userId} sent price ₹${dto.price} for Puja ${dto.puja_id}, but authoritative price is ₹${authoritativePrice}. Override applied.`,
      );
    }

    if (
      (dto.mode === PujaMode.HOME_VISIT_WITH ||
        dto.mode === PujaMode.HOME_VISIT_WITHOUT) &&
      !dto.address
    ) {
      throw new BadRequestException(
        'Address is required for Home Visit Puja bookings',
      );
    }

    const appointment = this.pujaAppointmentRepository.create({
      client_id: clientAccount.id,
      expert_id: puja.expert_id,
      puja_id: dto.puja_id,
      scheduled_date: dto.scheduled_date,
      scheduled_time: dto.scheduled_time,
      ask_expert_for_date: dto.ask_expert_for_date,
      mode: dto.mode,
      price: authoritativePrice, // Forced authoritative price
      user_message: dto.user_message,
      status: PujaAppointmentStatus.PENDING,
      address: dto.address as unknown as Record<string, unknown> | undefined,
    });

    const saved = await this.pujaAppointmentRepository.save(appointment);

    // Notify Expert
    const expertProfile = puja.expert;

    if (expertProfile && expertProfile.user_id) {
      try {
        await this.notificationService.create(
          expertProfile.id,
          RoleEnum.EXPERT,
          NotificationType.PUJA_BOOKING,
          'New Puja Booking Request',
          `You have received a new booking request for ${puja.name}.`,
          { appointment_id: saved.id, type: 'PUJA_BOOKING' },
        );

        // Real-time socket notification
        // Assuming you have a method to emit socket events to the expert
      } catch (error) {
        console.error('Failed to send notification to expert:', error);
        // Non-blocking error
      }
    }

    return saved;
  }
}
