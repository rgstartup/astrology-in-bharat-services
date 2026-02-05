import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@/modules/chat';
import { Transaction, TransactionType, TransactionPurpose, Wallet } from '@/modules/wallet';
import { ProfileExpert } from '../../domain/entities/profile-expert.entity';
import { User } from '@/modules/users';
import { IExpertRepository } from '../../domain/repositories/expert.repository.interface';

@Injectable()
export class ExpertDashboardService {
    constructor(
        @InjectRepository(ChatSession)
        private chatSessionRepo: Repository<ChatSession>,
        @InjectRepository(Transaction)
        private transactionRepo: Repository<Transaction>,
        @InjectRepository(Wallet)
        private walletRepo: Repository<Wallet>,
        @Inject(IExpertRepository)
        private expertRepository: IExpertRepository,
    ) { }

    async getDashboardStats(userId: number, type: 'today' | 'total' = 'today') {
        // 1. Get Expert Profile ID
        const expertProfile = await this.expertRepository.findByUserId(userId);

        if (!expertProfile) {
            throw new NotFoundException('Expert profile not found');
        }

        const expertId = expertProfile.id;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (type === 'today') {
            // 2. Today's Appointments (All requests received today)
            const todayAppointments = await this.chatSessionRepo.count({
                where: {
                    expert: { id: expertId },
                    createdAt: MoreThanOrEqual(startOfToday),
                },
            });

            // 3. Completed Today (Marked as completed today)
            const completedToday = await this.chatSessionRepo.count({
                where: {
                    expert: { id: expertId },
                    status: ChatSessionStatus.COMPLETED,
                    updatedAt: MoreThanOrEqual(startOfToday),
                },
            });

            // 4. Expired Today (Expired/Cancelled/Missed today)
            const expiredToday = await this.chatSessionRepo.count({
                where: {
                    expert: { id: expertId },
                    status: In([ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED]),
                    updatedAt: MoreThanOrEqual(startOfToday),
                },
            });

            // 5. Today's Earnings
            const wallet = await this.walletRepo.findOne({
                where: { userId },
            });

            let todayEarnings = 0;
            if (wallet) {
                const result = await this.transactionRepo
                    .createQueryBuilder('transaction')
                    .select('SUM(transaction.amount)', 'total')
                    .where('transaction.walletId = :walletId', { walletId: wallet.id })
                    .andWhere('transaction.type = :type', { type: TransactionType.CREDIT })
                    .andWhere('transaction.purpose = :purpose', {
                        purpose: TransactionPurpose.CONSULTATION,
                    })
                    .andWhere('transaction.createdAt >= :startOfToday', {
                        startOfToday,
                    })
                    .getRawOne();

                todayEarnings = parseFloat(result.total) || 0;
            }

            return {
                today_appointments: todayAppointments,
                completed_today: completedToday,
                expired_today: expiredToday,
                today_earnings: todayEarnings,
            };
        } else {
            // Type is 'total' (Lifetime View)

            // 2. Total Appointments (Lifetime)
            const totalAppointments = await this.chatSessionRepo.count({
                where: {
                    expert: { id: expertId },
                },
            });

            // 3. Total Completed (Lifetime)
            const totalCompleted = await this.chatSessionRepo.count({
                where: {
                    expert: { id: expertId },
                    status: ChatSessionStatus.COMPLETED,
                },
            });

            // 4. Total Expired (Lifetime)
            const totalExpired = await this.chatSessionRepo.count({
                where: {
                    expert: { id: expertId },
                    status: In([ChatSessionStatus.EXPIRED, ChatSessionStatus.CANCELLED]),
                },
            });

            // 5. Total Earnings (Lifetime)
            const wallet = await this.walletRepo.findOne({
                where: { userId },
            });

            let totalEarnings = 0;
            if (wallet) {
                const result = await this.transactionRepo
                    .createQueryBuilder('transaction')
                    .select('SUM(transaction.amount)', 'total')
                    .where('transaction.walletId = :walletId', { walletId: wallet.id })
                    .andWhere('transaction.type = :type', { type: TransactionType.CREDIT })
                    .andWhere('transaction.purpose = :purpose', {
                        purpose: TransactionPurpose.CONSULTATION,
                    })
                    .getRawOne();

                totalEarnings = parseFloat(result.total) || 0;
            }

            return {
                total_appointments: totalAppointments,
                total_completed: totalCompleted,
                total_expired: totalExpired,
                total_earnings: totalEarnings,
            };
        }
    }
}

