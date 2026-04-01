import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';

@Injectable()
export class EndChatUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        private walletFacade: WalletFacade,
        private notificationFacade: NotificationFacade,
    ) { }

    async execute(sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
        });
        if (!session || session.status === ChatSessionStatus.COMPLETED) {
            return session;
        }

        const now = new Date();
        session.end_time = now;
        session.status = ChatSessionStatus.COMPLETED;

        let total_cost = 0;
        if (session.start_time) {
            const durationInMs = now.getTime() - session.start_time.getTime();
            const actualDurationMins = durationInMs / 60000;

            // Subtract free minutes if applicable
            const billableMins = Math.max(
                0,
                actualDurationMins - (session.free_minutes || 0),
            );
            // Limit to two decimal places for accurate sub-minute billing
            total_cost = Number((billableMins * session.price_per_minute).toFixed(2));
        }

        session.total_cost = total_cost;
        await this.sessionRepo.save(session);

        const referenceId = `chat_${sessionId}`;
        const initialReservation = session.price_per_minute * 5;

        try {
            if (total_cost <= initialReservation) {
                if (total_cost > 0) {
                    await this.walletFacade.deductFromReserved(
                        session.user_id,
                        total_cost,
                        referenceId,
                    );
                }
                const remainingReserved = initialReservation - total_cost;
                if (remainingReserved > 0) {
                    await this.walletFacade.releaseReserved(
                        session.user_id,
                        remainingReserved,
                        referenceId,
                    );
                }
            } else {
                await this.walletFacade.deductFromReserved(
                    session.user_id,
                    initialReservation,
                    referenceId,
                );
                const excessCost = total_cost - initialReservation;
                await this.walletFacade.debit(
                    session.user_id,
                    excessCost,
                    TransactionPurpose.CONSULTATION,
                    referenceId,
                );
            }

            // 💳 Credit Expert
            if (total_cost > 0) {
                const sessionWithExpert = await this.sessionRepo.findOne({
                    where: { id: sessionId },
                    relations: ['expert', 'expert.user'],
                });

                if (sessionWithExpert?.expert?.user?.id) {
                    await this.walletFacade.credit(
                        sessionWithExpert.expert.user.id,
                        total_cost,
                        TransactionPurpose.CONSULTATION,
                        referenceId,
                    );
                }
            }
        } catch (error) {
            console.error(`Failed to settle wallet for session ${sessionId}:`, error);
        }

        // Return updated session with user's remaining balance for the summary popup
        const remainingBalance = await this.walletFacade.getBalance(
            session.user_id,
        );
        // 🔔 Notify User
        try {
            const sessionWithExpert = await this.sessionRepo.findOne({
                where: { id: sessionId },
                relations: ['expert', 'expert.user'],
            });

            if (sessionWithExpert) {
                const startTime = sessionWithExpert.start_time ? sessionWithExpert.start_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const endTime = sessionWithExpert.end_time ? sessionWithExpert.end_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const expertName = sessionWithExpert.expert?.user?.name || 'Astrologer';
                const duration = sessionWithExpert.start_time ? ((sessionWithExpert.end_time.getTime() - sessionWithExpert.start_time.getTime()) / 60000).toFixed(1) : '0';
                
                const title = "Consultation Summary";
                const message = `From ${startTime} to ${endTime} you consulted ${expertName} via Chat, total duration: ${duration} mins, total cost: ₹${sessionWithExpert.total_cost}`;
                
                await this.notificationFacade.create(
                    sessionWithExpert.user_id,
                    NotificationType.GENERAL,
                    title,
                    message,
                    { sessionId, type: 'CHAT_SUMMARY' }
                );
            }
        } catch (error) {
            console.error(`Failed to send end-chat notification for session ${sessionId}:`, error);
        }

        return {
            ...session,
            remainingBalance,
            durationMins: session.start_time
                ? Number(((session.end_time.getTime() - session.start_time.getTime()) / 60000).toFixed(2))
                : 0,
        };
    }
}
