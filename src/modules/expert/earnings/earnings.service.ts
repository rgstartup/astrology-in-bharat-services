import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@/modules/chat/entities/chat-session.entity';
import { ProfileExpert } from '../profile/entities/profile-expert.entity';
import { WalletService } from '@/modules/wallet/wallet.service';

@Injectable()
export class ExpertEarningsService {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
        private walletService: WalletService,
    ) { }

    async getStats(userId: number, range: string) {
        const expert = await this.expertRepo.findOne({
            where: { user: { id: userId } },
        });
        if (!expert) return null;

        const expertId = expert.id;
        const now = new Date();
        let startDate: Date;

        if (range === 'today') {
            startDate = new Date(now.setHours(0, 0, 0, 0));
        } else {
            // Default last 6 months
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
        }

        const sessions = await this.sessionRepo.find({
            where: {
                expertId,
                status: ChatSessionStatus.COMPLETED,
                createdAt: Between(startDate, new Date()),
            },
            relations: ['user'],
        });

        const totalRevenue = sessions.reduce((acc, s) => acc + (s.totalCost || 0), 0);
        const chatRevenue = totalRevenue;

        // Service Color Mapping
        const serviceColors: Record<string, string> = {
            "Chat Consultation": "#f59e0b",      // Amber
            "Video Call Consultation": "#8b5cf6", // Purple
            "Call Consultation": "#10b981",       // Green
            "Report Generation": "#ef4444",       // Red
            "Horoscope Analysis": "#3b82f6",      // Blue
            "Custom Service": "#6b7280"           // Gray
        };
        const getColor = (name: string) => serviceColors[name] || "#6b7280";

        // Group by month for chart data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const incomeTrendsMap = new Map();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(now.getMonth() - i);
            const label = months[d.getMonth()];
            incomeTrendsMap.set(label, 0);
        }

        sessions.forEach(s => {
            const label = months[s.createdAt.getMonth()];
            if (incomeTrendsMap.has(label)) {
                incomeTrendsMap.set(label, incomeTrendsMap.get(label) + (s.totalCost || 0));
            }
        });

        // 1. Fixed Income Trends (month -> label, amount -> value)
        const incomeTrends = Array.from(incomeTrendsMap, ([label, value]) => ({ label, value }));

        // Top Users
        const userStats = new Map();
        sessions.forEach(s => {
            const userData = userStats.get(s.userId) || {
                id: s.userId,
                name: s.user?.name || 'Unknown',
                avatar: s.user?.avatar || '',
                amount: 0,
                sessions: 0
            };
            userData.amount += (s.totalCost || 0);
            userData.sessions += 1;
            userStats.set(s.userId, userData);
        });

        const topUsers = Array.from(userStats.values())
            .sort((a, b) => b.amount - a.amount)
            .map(u => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar,
                totalSpent: u.amount,
                sessions: u.sessions
            }))
            .slice(0, 5);

        // --- Dynamic Top Services ---
        interface ServiceStat {
            id: string;
            name: string;
            amount: number;
            usage: number;
        }
        const services: ServiceStat[] = [];

        // 1. Standard Services
        if ((expert.chat_price || 0) > 0) {
            services.push({
                id: 'srv_chat',
                name: 'Chat Consultation',
                amount: chatRevenue,
                usage: sessions.length
            });
        }
        if ((expert.call_price || 0) > 0) {
            services.push({
                id: 'srv_call',
                name: 'Call Consultation',
                amount: 0,
                usage: 0
            });
        }
        if ((expert.video_call_price || 0) > 0) {
            services.push({
                id: 'srv_video',
                name: 'Video Call Consultation',
                amount: 0,
                usage: 0
            });
        }
        if ((expert.report_price || 0) > 0) {
            services.push({
                id: 'srv_report',
                name: 'Report Generation',
                amount: 0,
                usage: 0
            });
        }
        if ((expert.horoscope_price || 0) > 0) {
            services.push({
                id: 'srv_horoscope',
                name: 'Horoscope Analysis',
                amount: 0,
                usage: 0
            });
        }

        // 2. Custom Services
        if (expert.custom_services && Array.isArray(expert.custom_services)) {
            expert.custom_services.forEach((cs: any, index: number) => {
                services.push({
                    id: `srv_custom_${index}`,
                    name: cs.name || 'Custom Service',
                    amount: 0,
                    usage: 0,
                });
            });
        }

        // Sort by revenue descending
        const sortedServices = services.sort((a, b) => b.amount - a.amount);

        const topServices = sortedServices.map(s => ({
            id: s.id,
            name: s.name,
            revenue: s.amount,
            usageCount: s.usage,
            color: getColor(s.name)
        }));

        // Revenue Breakdown Calculation
        const breakdownData = [
            { category: 'Chat', amount: chatRevenue, color: getColor('Chat Consultation') },
            { category: 'Others', amount: 0, color: getColor('Others') }
        ].filter(item => item.amount >= 0);

        // Calculate Percentages
        const totalBreakdownAmount = breakdownData.reduce((sum, item) => sum + item.amount, 0);
        const revenueBreakdown = breakdownData
            .map(item => ({
                ...item,
                percentage: totalBreakdownAmount > 0 ? Math.round((item.amount / totalBreakdownAmount) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount); // Sort by amount descending

        // Fetch Wallet Data
        const walletBalance = await this.walletService.getBalance(userId);
        const { totalWithdrawn } = await this.walletService.getWithdrawalsStatus(userId);

        // Fetch Recent Transactions
        const { items: transactions } = await this.walletService.getTransactions(userId, 1, 5, 'all');
        const recentTransactions = transactions.map(t => ({
            id: t.id.toString(),
            date: t.createdAt,
            description: t.purpose,
            type: t.type.toLowerCase(), // 'credit' | 'debit'
            amount: Number(t.amount),
            status: 'completed'
        }));

        return {
            stats: {
                totalRevenue,
                walletBalance: walletBalance || 0,
                totalWithdrawn: totalWithdrawn || 0,
                revenueGrowth: 0, // Placeholder
                balanceGrowth: 0, // Placeholder
                withdrawalGrowth: 0, // Placeholder
            },
            incomeTrends,
            revenueBreakdown,
            topUsers,
            topServices,
            recentTransactions
        };
    }
}
