// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/entities/transaction.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class EndChatUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        private walletFacade: WalletFacade,
        private notificationFacade: NotificationFacade,
    ) { }

    async execute(sessionId: string) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId as any },
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

        // Fetch all required commission percentages
        const platformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_ASTROLOGER');
        const gstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
        const buyerAgentRateSetting = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FOR_BUYER_AGENT');

        // Fetch Expert with User to check for referral
        const sessionWithExpert = await this.sessionRepo.findOne({
            where: { id: sessionId as any },
            relations: ['expert', 'expert.user'],
        });

        const expert = sessionWithExpert?.expert;
        const expertUser = expert?.user;

        let agent_commission = 0;
        let agent_id: string | undefined = undefined;

        // Check if Agent Commission is applicable (Referred)
        if (expertUser?.referred_by_id && expert) {
            agent_id = expertUser.referred_by_id;
            const effectiveAgentRate = expert.agent_commission_rate ?? platformFeeRate;
            agent_commission = Number((total_cost * (effectiveAgentRate / 100)).toFixed(2));
        }

        // Fetch Buyer's Agent
        let buyer_agent_commission = 0;
        let buyer_agent_id: string | undefined = undefined;
        
        const buyerUser = await this.sessionRepo.manager.findOne(User, {
            where: { id: session.client_id },
            select: ['id', 'referred_by_id']
        });

        if (buyerUser?.referred_by_id) {
            buyer_agent_id = buyerUser.referred_by_id;
            buyer_agent_commission = Number((total_cost * (buyerAgentRateSetting / 100)).toFixed(2));
        }

        const platform_fee = Number((total_cost * (platformFeeRate / 100)).toFixed(2));
        const gst = Number((platform_fee * (gstRate / 100)).toFixed(2));
        
        // Expert Net = Total - Platform - GST - Agent (Seller) - Agent (Buyer)
        const expert_earning = Number((total_cost - platform_fee - gst - agent_commission - buyer_agent_commission).toFixed(2));

        session.total_cost = total_cost;
        session.platform_fee = platform_fee;
        session.gst = gst;
        session.expert_earning = expert_earning;
        session.agent_id = agent_id;
        session.agent_commission = agent_commission;
        
        const split = {
            totalAmount: total_cost,
            totalCost: total_cost, // Alias for compatibility
            platformFee: Number((total_cost - expert_earning).toFixed(2)), // Deductions = Total - Net
            expertShare: expert_earning,
            agent_commission,
            buyer_agent_commission,
        };

        await this.sessionRepo.save(session);

        const referenceId = `chat_${sessionId}`;
        
        // 🏦 Settlement Logic
        try {
            const initialReservation = session.price_per_minute * 5; 

            if (total_cost <= initialReservation) {
                if (total_cost > 0) {
                    await this.walletFacade.deductFromReserved(
                        session.client_id,
                        total_cost,
                        referenceId,
                    );
                }
                const remainingReserved = initialReservation - total_cost;
                if (remainingReserved > 0) {
                    await this.walletFacade.releaseReserved(
                        session.client_id,
                        remainingReserved,
                        referenceId,
                    );
                }
            } else {
                await this.walletFacade.deductFromReserved(
                    session.client_id,
                    initialReservation,
                    referenceId,
                );
                const excessCost = total_cost - initialReservation;
                await this.walletFacade.debit(
                    session.client_id,
                    excessCost,
                    TransactionPurpose.CONSULTATION,
                    referenceId,
                );
            }

            // 💳 Credit Expert and Agents (Using pre-calculated earnings)
            if (total_cost > 0) {
                if (expertUser?.id) {
                    await this.walletFacade.credit(
                        expertUser.id,
                        session.expert_earning,
                        TransactionPurpose.CONSULTATION,
                        referenceId,
                    );
                }

                // 💰 Credit Seller's Agent
                if (agent_commission > 0 && agent_id) {
                    await this.walletFacade.credit(
                        agent_id,
                        agent_commission,
                        TransactionPurpose.AGENT_COMMISSION,
                        referenceId,
                    );
                }

                // 💰 Credit Buyer's Agent
                if (buyer_agent_commission > 0 && buyer_agent_id) {
                    await this.walletFacade.credit(
                        buyer_agent_id,
                        buyer_agent_commission,
                        TransactionPurpose.AGENT_COMMISSION,
                        `chat_buyer_ref_${sessionId}`,
                    );
                }
            }
        } catch (error) {
            console.error(`Failed to settle wallet for session ${sessionId}:`, error);
        }

        // Return updated session with user's remaining balance for the summary popup
        const remainingBalance = await this.walletFacade.getBalance(
            session.client_id,
        );
        // 🔔 Notify User
        try {
            const sessionWithExpert = await this.sessionRepo.findOne({
                where: { id: sessionId as any },
                relations: ['expert', 'expert.user'],
            });

            if (sessionWithExpert) {
                const startTime = sessionWithExpert.start_time ? sessionWithExpert.start_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const endTime = sessionWithExpert.end_time ? sessionWithExpert.end_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const expertName = sessionWithExpert.expert?.client?.name || 'Astrologer';
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
            split,
        };
    }
}
