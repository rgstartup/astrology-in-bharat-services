import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PujaAppointment, PujaAppointmentStatus } from '../../infrastructure/persistence/entities/puja-appointment.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { UpdatePujaAppointmentStatusDto } from '../dtos/update-puja-appointment-status.dto';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';
import { TodosFacade } from '@/modules/expert/todos/application/todos.facade';


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

  async execute(id: number, operatingUserId: number, dto: UpdatePujaAppointmentStatusDto): Promise<PujaAppointment> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
        const appointment = await qr.manager.findOne(PujaAppointment, { 
            where: { id },
            relations: ['expert', 'puja', 'user']
        });

        if (!appointment) {
          throw new NotFoundException('Appointment not found');
        }

        // Resolve expert's numeric local user ID from better_auth_user_id
        const expertLocalUser = await qr.manager.findOne(User, {
            where: { better_auth_user_id: appointment.expert.better_auth_user_id },
            select: ['id'],
        });
        const expertNumericUserId = expertLocalUser?.id;

        // Determine who is performing the update
        const isExpert = expertNumericUserId === operatingUserId;
        const isClient = appointment.user_id === operatingUserId;

        if (!isExpert && !isClient) {
            throw new NotFoundException('Appointment not found for this user');
        }

        // Rules for client update
        if (isClient && !isExpert) {
            if (dto.status !== PujaAppointmentStatus.CONFIRMED) {
                throw new BadRequestException('As a client, you can only confirm the appointment after payment.');
            }
            if (appointment.status !== PujaAppointmentStatus.ACCEPTED) {
                throw new BadRequestException('Appointment must be accepted by the expert before you can confirm and pay.');
            }
            
            // --- PAYMENT LOGIC WITH ATOMIC TRANSACTION ---
            // 1. Debit User
            await this.walletFacade.debit(
                appointment.user_id, 
                appointment.price, 
                TransactionPurpose.PUJA_CONFIRMATION, 
                `puja_appt_${appointment.id}`,
                qr
            );
            
            // 2. Credit Expert
            if (expertNumericUserId) {
              await this.walletFacade.credit(
                  expertNumericUserId,
                  appointment.price,
                  TransactionPurpose.CONSULTATION,
                  `puja_appt_${appointment.id}`,
                  qr
              );
            }

            // 3. Create Todo for Expert
            if (expertNumericUserId) {
              try {
                  await this.todosFacade.create(expertNumericUserId, {
                      text: `Confirmed Puja: ${appointment.puja?.name} with ${appointment.user?.name || 'Client'} on ${appointment.scheduled_date} at ${appointment.scheduled_time}`
                  });
              } catch (err) {
                  console.error('Failed to create todo for expert:', err);
              }
            }

            // 4. Notify Expert
            if (expertNumericUserId) {
              try {
                  await this.notificationFacade.create(
                      expertNumericUserId,
                      NotificationType.GENERAL,
                      'Puja Confirmed! (Paid)',
                      `User ${appointment.user?.name || 'Client'} has paid for the ${appointment.puja?.name || 'Puja'} Ritual scheduled for ${appointment.scheduled_date}.`,
                      { appointment_id: appointment.id, type: 'PUJA_CONFIRMED' }
                  );
              } catch (err) {
                  console.error('Failed to notify expert of confirmation:', err);
              }
            }
        }

        // Apply the updates
        if (dto.status) appointment.status = dto.status;
        if (dto.expert_message) appointment.expert_message = dto.expert_message;
        if (dto.scheduled_date) appointment.scheduled_date = dto.scheduled_date;
        if (dto.scheduled_time) appointment.scheduled_time = dto.scheduled_time;
        if (dto.price !== undefined) appointment.price = dto.price;

        const saved = await qr.manager.save(PujaAppointment, appointment);

        // Notify User (if update was by expert)
        if (isExpert) {
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
        }

        await qr.commitTransaction();
        return saved;
    } catch (err) {
        await qr.rollbackTransaction();
        throw err;
    } finally {
        await qr.release();
    }
  }
}
