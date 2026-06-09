import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PujaAppointment, PujaAppointmentStatus } from '../../infrastructure/entities/puja-appointment.entity';
import { UpdatePujaAppointmentStatusDto } from '../dtos/update-puja-appointment-status.dto';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/entities/transaction.entity';
import { TodosFacade } from '@/modules/expert/todos/application/todos.facade';
import { User } from '@/modules/users/infrastructure/entities/user.entity';


@Injectable()
export class UpdatePujaAppointmentStatusUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    private notificationFacade: NotificationFacade,
    private walletFacade: WalletFacade,
    private todosFacade: TodosFacade,
    private dataSource: DataSource,
  ) {}

  async execute(id: string, operatingUserId: string, dto: UpdatePujaAppointmentStatusDto): Promise<BooleanMessage> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
        const appointment = await qr.manager.findOne(PujaAppointment, { 
            where: { id },
            relations: ['expert', 'puja', 'client', 'client.user']
        });

        if (!appointment) {
          throw new NotFoundException('Appointment not found');
        }

        // Determine who is performing the update
        const isExpert = appointment.expert.user_id as any === operatingUserId;
        const isClient = appointment.client?.user_id === operatingUserId;

        if (!isExpert && !isClient) {
            throw new NotFoundException('Appointment not found for this user');
        }

        // Rules for client update
        if (isClient && !isExpert) {
            if (dto.status === PujaAppointmentStatus.ACCEPTED) {
                if (appointment.status !== PujaAppointmentStatus.ON_HOLD) {
                    throw new BadRequestException('You can only accept an appointment that has been rescheduled (ON_HOLD) by the expert.');
                }
            } else if (dto.status !== PujaAppointmentStatus.CONFIRMED && dto.status !== PujaAppointmentStatus.CANCELLED) {
                throw new BadRequestException('As a client, you can only confirm (pay), accept reschedule, or cancel the appointment.');
            }

            if (dto.status === PujaAppointmentStatus.CONFIRMED) {
                if (appointment.status !== PujaAppointmentStatus.ACCEPTED && appointment.status !== PujaAppointmentStatus.ON_HOLD) {
                    throw new BadRequestException('Appointment must be accepted or rescheduled by the expert before you can confirm and pay.');
                }
                
                // --- PAYMENT LOGIC WITH ATOMIC TRANSACTION ---
                const totalAmount = appointment.price;

                // Fetch all required commission percentages
                const platformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_ASTROLOGER');
                const gstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
                const buyerAgentRateSetting = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FOR_BUYER_AGENT');

                // Fetch Expert's full user profile for referral check
                const expertUser = await qr.manager.findOne(User, {
                    where: { id: appointment.expert.user_id as any }
                });

                const { ProfileExpert } = await import('../../../expert/profile/infrastructure/entities/profile-expert.entity');
                const expertProfile = await qr.manager.findOne(ProfileExpert, {
                    where: { user: { id: appointment.expert.user_id as any } }
                });

                let agent_commission = 0;
                let agent_id: string | undefined = undefined;

                // Check if Seller Agent Commission is applicable (Referred)
                if (expertUser?.referred_by_id && expertProfile) {
                    agent_id = expertUser.referred_by_id;
                    const effectiveAgentRate = expertProfile.agent_commission_rate ?? platformFeeRate;
                    agent_commission = Number((totalAmount * (effectiveAgentRate / 100)).toFixed(2));
                }

                let buyer_agent_commission = 0;
                let buyer_agent_id: string | undefined = undefined;

                const buyerUser = await qr.manager.findOne(User, {
                    where: { id: appointment.client?.user_id as any || "" },
                    select: ['id', 'referred_by_id']
                });

                if (buyerUser?.referred_by_id) {
                    buyer_agent_id = buyerUser.referred_by_id;
                    buyer_agent_commission = Number((totalAmount * (buyerAgentRateSetting / 100)).toFixed(2));
                }

                const platformFee = Number((totalAmount * (platformFeeRate / 100)).toFixed(2));
                const gst = Number((platformFee * (gstRate / 100)).toFixed(2));
                
                // Expert Net = Total - Platform - GST - Agent (Seller) - Agent (Buyer)
                const expertNetShare = Number((totalAmount - platformFee - gst - agent_commission - buyer_agent_commission).toFixed(2));

                // 1. Debit User
                await this.walletFacade.debit(
                    appointment.client?.user_id as any || "", 
                    totalAmount, 
                    TransactionPurpose.PUJA_CONFIRMATION, 
                    `puja_appt_${appointment.id}`,
                    qr
                );
                
                // 2. Credit Expert (Net Share)
                await this.walletFacade.credit(
                    appointment.expert.user_id as any, 
                    expertNetShare, 
                    TransactionPurpose.PUJA_CONFIRMATION, 
                    `puja_appt_${appointment.id}`,
                    qr
                );

                // 3. Credit Seller's Agent (if applicable)
                if (agent_commission > 0 && agent_id) {
                    await this.walletFacade.credit(
                        agent_id,
                        agent_commission,
                        'agent_commission' as any,
                        `puja_appt_${appointment.id}`,
                        qr
                    );
                }

                // 4. Credit Buyer's Agent (if applicable)
                if (buyer_agent_commission > 0 && buyer_agent_id) {
                    await this.walletFacade.credit(
                        buyer_agent_id,
                        buyer_agent_commission,
                        'agent_commission' as any,
                        `puja_appt_buyer_ref_${appointment.id}`,
                        qr
                    );
                }

                // 3. Create Todo for Expert
                try {
                    // Not strictly part of financial transaction, but good to have
                    await this.todosFacade.create(appointment.expert.user_id as any as any, {
                        text: `Confirmed Puja: ${appointment.puja?.name} with ${appointment.client?.user?.name || 'Client'} on ${appointment.scheduled_date} at ${appointment.scheduled_time}`
                    });
                } catch (err) {
                    console.error('Failed to create todo for expert:', err);
                }

                // 4. Notify Expert
                try {
                    await this.notificationFacade.create(
                        appointment.expert.user_id as any,
                        NotificationType.GENERAL,
                        'Puja Confirmed! (Paid)',
                        `User ${appointment.client?.user?.name || 'Client'} has paid for the ${appointment.puja?.name || 'Puja'} Ritual scheduled for ${appointment.scheduled_date}.`,
                        { appointment_id: appointment.id, type: 'PUJA_CONFIRMED' }
                    );
                } catch (err) {
                    console.error('Failed to notify expert of confirmation:', err);
                }
            }
        }

        // --- SECURITY CHECK: ROLE-BASED FIELD UPDATES ---
        if (dto.status) {
            if (isClient && !isExpert) {
                // Client restricted statuses
                const allowedClientStatuses = [
                    PujaAppointmentStatus.CONFIRMED, 
                    PujaAppointmentStatus.CANCELLED,
                    PujaAppointmentStatus.ACCEPTED
                ];
                if (!allowedClientStatuses.includes(dto.status)) {
                    throw new BadRequestException(`As a client, you cannot set status to ${dto.status}`);
                }
            }
            appointment.status = dto.status;
        }

        if (dto.expert_message) {
            if (!isExpert) {
                throw new BadRequestException('Only the expert can provide or update the expert message.');
            }
            appointment.expert_message = dto.expert_message;
        }

        if (dto.price !== undefined) {
            if (!isExpert) {
                throw new BadRequestException('Only the expert can adjust the price of the ritual.');
            }
            appointment.price = dto.price;
        }

        if (dto.scheduled_date) {
            if (!isExpert && appointment.status !== PujaAppointmentStatus.PENDING) {
                throw new BadRequestException('Schedule can only be modified by the expert once the request is processed.');
            }
            appointment.scheduled_date = dto.scheduled_date;
        }

        if (dto.scheduled_time) {
            if (!isExpert && appointment.status !== PujaAppointmentStatus.PENDING) {
                throw new BadRequestException('Schedule can only be modified by the expert once the request is processed.');
            }
            appointment.scheduled_time = dto.scheduled_time;
        }

        const saved = await qr.manager.save(PujaAppointment, appointment);

        // Notify User (if update was by expert)
        if (isExpert) {
            let title = 'Puja Request Update';
            let message = `Your request for ${appointment.puja?.name || 'Puja'} has been ${dto.status}.`;
            
            if (dto.status === PujaAppointmentStatus.ON_HOLD) message = `Your request for ${appointment.puja?.name || 'Puja'} is on hold.`;
            if (dto.status === PujaAppointmentStatus.ACCEPTED) title = 'Puja Request Accepted!';

            try {
                await this.notificationFacade.create(
                    appointment.client?.user_id as any || "",
                    NotificationType.GENERAL,
                    title,
                    message,
                    { appointment_id: saved.id, type: 'PUJA_STATUS_UPDATE' }
                );
            } catch (error) {
                console.error('Failed to send status update notification to user:', error);
            }
        }

        // Notify Expert (if update was by client)
        if (isClient && !isExpert && dto.status === PujaAppointmentStatus.ACCEPTED) {
            try {
                await this.notificationFacade.create(
                    appointment.expert.user_id as any,
                    NotificationType.GENERAL,
                    'Reschedule Accepted!',
                    `User ${appointment.client?.user?.name || 'Client'} has accepted your proposed time for ${appointment.puja?.name || 'Puja'}.`,
                    { appointment_id: saved.id, type: 'PUJA_RESCHEDULE_ACCEPTED' }
                );
            } catch (error) {
                console.error('Failed to send status update notification to expert:', error);
            }
        }

        await qr.commitTransaction();
        return new BooleanMessage();
    } catch (err) {
        await qr.rollbackTransaction();
        throw err;
    } finally {
        await qr.release();
    }
  }
}
