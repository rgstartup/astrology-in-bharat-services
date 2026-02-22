import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';

@Injectable()
export class EndChatUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
        });
        if (!session || session.status === ChatSessionStatus.COMPLETED) {
            return session;
        }

        const now = new Date();
        session.endTime = now;
        session.status = ChatSessionStatus.COMPLETED;

        let totalCost = 0;
        if (session.startTime) {
            const durationInMs = now.getTime() - session.startTime.getTime();
            const actualDurationMins = Math.ceil(durationInMs / 60000);

            // Subtract free minutes if applicable
            const billableMins = Math.max(
                0,
                actualDurationMins - (session.freeMinutes || 0),
            );
            totalCost = billableMins * session.pricePerMinute;
        }

        session.totalCost = totalCost;
        await this.sessionRepo.save(session);

        const referenceId = `chat_${sessionId}`;
        const initialReservation = session.pricePerMinute * 5;

        try {
            if (totalCost <= initialReservation) {
                if (totalCost > 0) {
                    await this.walletFacade.deductFromReserved(
                        session.userId,
                        totalCost,
                        referenceId,
                    );
                }
                const remainingReserved = initialReservation - totalCost;
                if (remainingReserved > 0) {
                    await this.walletFacade.releaseReserved(
                        session.userId,
                        remainingReserved,
                        referenceId,
                    );
                }
            } else {
                await this.walletFacade.deductFromReserved(
                    session.userId,
                    initialReservation,
                    referenceId,
                );
                const excessCost = totalCost - initialReservation;
                await this.walletFacade.debit(
                    session.userId,
                    excessCost,
                    TransactionPurpose.CONSULTATION,
                    referenceId,
                );
            }

            // 💳 Credit Expert
            if (totalCost > 0) {
                const sessionWithExpert = await this.sessionRepo.findOne({
                    where: { id: sessionId },
                    relations: ['expert', 'expert.user'],
                });

                if (sessionWithExpert?.expert?.user?.id) {
                    await this.walletFacade.credit(
                        sessionWithExpert.expert.user.id,
                        totalCost,
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
            session.userId,
        );
        return {
            ...session,
            remainingBalance,
            durationMins: session.startTime
                ? Math.ceil(
                    (session.endTime.getTime() - session.startTime.getTime()) / 60000,
                )
                : 0,
        };
    }
}
