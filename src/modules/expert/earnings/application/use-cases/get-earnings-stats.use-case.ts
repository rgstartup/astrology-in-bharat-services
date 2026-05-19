import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession, CallSessionStatus, CallType } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { Order, OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PujaAppointment, PujaAppointmentStatus } from '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity';
import { Review } from '@/modules/consultation/reviews/infrastructure/entities/review.entity';


@Injectable()
export class GetEarningsStatsUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(CallSession)
        private callRepo: Repository<CallSession>,
        @InjectRepository(OrderItem)
        private orderItemRepo: Repository<OrderItem>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
        @InjectRepository(PujaAppointment)
        private pujaRepo: Repository<PujaAppointment>,
        @InjectRepository(Review)
        private reviewRepo: Repository<Review>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(userId: number, period: string, startDateStr?: string, endDateStr?: string) {
        const expert = await this.expertRepo.findOne({
            where: { user: { id: userId } },
        });
        if (!expert) return null;

        const expertId = expert.id;
        
        // --- Date Range Calculation ---
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();
        let prevStartDate: Date;
        let prevEndDate: Date;

        if (period === 'today') {
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 1);
            prevEndDate = new Date(startDate);
        } else if (period === 'last_month') {
            startDate = new Date();
            startDate.setDate(now.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(prevStartDate.getDate() - 30);
            prevEndDate = new Date(startDate);
        } else if (period === 'last_6_months') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
            
            prevStartDate = new Date(startDate);
            prevStartDate.setMonth(prevStartDate.getMonth() - 6);
            prevEndDate = new Date(startDate);
        } else if (period === 'custom' && startDateStr && endDateStr) {
            startDate = new Date(startDateStr);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endDateStr);
            endDate.setHours(23, 59, 59, 999);
            
            const diffMs = endDate.getTime() - startDate.getTime();
            prevStartDate = new Date(startDate.getTime() - diffMs - 1);
            prevEndDate = new Date(startDate);
        } else {
            // Default last 6 months
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
            
            prevStartDate = new Date(startDate);
            prevStartDate.setMonth(prevStartDate.getMonth() - 6);
            prevEndDate = new Date(startDate);
        }

        // --- Data Fetching (Current Period) ---
        const [sessions, calls, pujas, reviews] = await Promise.all([
            this.sessionRepo.find({
                where: { expert_id: expertId, status: ChatSessionStatus.COMPLETED, created_at: Between(startDate, endDate) },
                relations: ['user'],
            }),
            this.callRepo.find({
                where: { expert_id: expertId, status: CallSessionStatus.COMPLETED, created_at: Between(startDate, endDate) },
                relations: ['user'],
            }),
            this.pujaRepo.find({
                where: { expert_id: expertId, status: PujaAppointmentStatus.CONFIRMED, created_at: Between(startDate, endDate) },
                relations: ['client', 'client.user', 'puja'],
            }),
            this.reviewRepo.find({
                where: { expert_id: expertId, created_at: Between(startDate, endDate) },
            })
        ]);

        // --- Data Fetching (Previous Period for Growth) ---
        const [prevSessions, prevCalls, prevPujas] = await Promise.all([
            this.sessionRepo.find({
                where: { expert_id: expertId, status: ChatSessionStatus.COMPLETED, created_at: Between(prevStartDate, prevEndDate) },
            }),
            this.callRepo.find({
                where: { expert_id: expertId, status: CallSessionStatus.COMPLETED, created_at: Between(prevStartDate, prevEndDate) },
            }),
            this.pujaRepo.find({
                where: { expert_id: expertId, status: PujaAppointmentStatus.CONFIRMED, created_at: Between(prevStartDate, prevEndDate) },
            })
        ]);

        const chatRevenue = sessions.reduce((acc, s) => acc + (s.total_cost || 0), 0);
        const callRevenue = calls.reduce((acc, c) => acc + (c.final_price || 0), 0);
        const pujaRevenue = pujas.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
        const totalRevenue = chatRevenue + callRevenue + pujaRevenue;

        const prevChatRevenue = prevSessions.reduce((acc, s) => acc + (s.total_cost || 0), 0);
        const prevCallRevenue = prevCalls.reduce((acc, c) => acc + (c.final_price || 0), 0);
        const prevPujaRevenue = prevPujas.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
        const prevTotalRevenue = prevChatRevenue + prevCallRevenue + prevPujaRevenue;

        const growth = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
        const consultationsCount = sessions.length + calls.length + pujas.length;
        const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

        // Service Color Mapping
        const serviceColors: Record<string, string> = {
            "Chat Consultation": "#f59e0b",
            "Video Call Consultation": "#8b5cf6",
            "Call Consultation": "#10b981",
            "Product Sales": "#ec4899",
            "Puja Rituals": "#f97316",
            "Report Generation": "#ef4444",
            "Horoscope Analysis": "#3b82f6",
            "Custom Service": "#6b7280"
        };
        const getColor = (name: string) => serviceColors[name] || "#6b7280";

        // Grouping logic for Trends
        const incomeTrendsMap = new Map<string, number>();
        const rangeMs = endDate.getTime() - startDate.getTime();
        const rangeDays = rangeMs / (1000 * 60 * 60 * 24);

        if (period === 'today') {
            for (let i = 0; i < 24; i++) {
                const label = `${i.toString().padStart(2, '0')}:00`;
                incomeTrendsMap.set(label, 0);
            }
        } else if (rangeDays <= 31) {
            for (let i = 0; i <= Math.ceil(rangeDays); i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                if (d > endDate) break;
                const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                incomeTrendsMap.set(label, 0);
            }
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let current = new Date(startDate);
            while (current <= endDate) {
                const label = months[current.getMonth()];
                incomeTrendsMap.set(label, 0);
                current.setMonth(current.getMonth() + 1);
            }
        }

        const addDataToTrends = (items: any[], priceFn: (item: any) => number) => {
            items.forEach(item => {
                let label: string;
                if (period === 'today') {
                    label = `${item.created_at.getHours().toString().padStart(2, '0')}:00`;
                } else if (rangeDays <= 31) {
                    label = item.created_at.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                } else {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    label = months[item.created_at.getMonth()];
                }
                if (incomeTrendsMap.has(label)) {
                    incomeTrendsMap.set(label, (incomeTrendsMap.get(label) || 0) + priceFn(item));
                }
            });
        };

        addDataToTrends(sessions, s => s.total_cost || 0);
        addDataToTrends(calls, c => c.final_price || 0);
        addDataToTrends(pujas, p => Number(p.price) || 0);

        const incomeTrends = Array.from(incomeTrendsMap, ([label, value]) => ({ label, value }));

        // Top Users
        const userStats = new Map();
        const updateTopUser = (userId: number, amount: number, userObj: any) => {
            if (!userId) return;
            const userData = userStats.get(userId) || {
                id: userId,
                name: userObj?.name || 'Unknown',
                avatar: userObj?.avatar || '',
                amount: 0,
                sessions: 0
            };
            userData.amount += amount;
            userData.sessions += 1;
            userStats.set(userId, userData);
        };

        sessions.forEach(s => updateTopUser(s.user_id, s.total_cost || 0, s.user));
        calls.forEach(c => updateTopUser(c.user_id, c.final_price || 0, c.user));
        pujas.forEach(p => updateTopUser(p.client?.user_id || 0, Number(p.price) || 0, p.client?.user));

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

        // Top Services
        const serviceStatsMap = new Map();
        serviceStatsMap.set('Chat Consultation', { id: 'srv_chat', name: 'Chat Consultation', amount: chatRevenue, usage: sessions.length });
        
        const audioCalls = calls.filter(c => c.type === CallType.AUDIO);
        const videoCalls = calls.filter(c => c.type === CallType.VIDEO);
        if (audioCalls.length > 0 || (expert.call_price || 0) > 0) {
            serviceStatsMap.set('Call Consultation', { id: 'srv_call', name: 'Call Consultation', amount: audioCalls.reduce((acc, c) => acc + (c.final_price || 0), 0), usage: audioCalls.length });
        }
        if (videoCalls.length > 0 || (expert.video_call_price || 0) > 0) {
            serviceStatsMap.set('Video Call Consultation', { id: 'srv_video', name: 'Video Call Consultation', amount: videoCalls.reduce((acc, c) => acc + (c.final_price || 0), 0), usage: videoCalls.length });
        }
        if (pujas.length > 0) {
            serviceStatsMap.set('Puja Rituals', { id: 'srv_pujas', name: 'Puja Rituals', amount: pujaRevenue, usage: pujas.length });
        }

        const topServices = Array.from(serviceStatsMap.values())
            .sort((a, b) => b.amount - a.amount)
            .map(s => ({
                id: s.id,
                name: s.name,
                revenue: s.amount,
                usageCount: s.usage,
                color: getColor(s.name)
            }));

        // Revenue Breakdown
        const breakdownData = [
            { category: 'Chat', amount: chatRevenue, color: getColor('Chat Consultation') },
            { category: 'Call', amount: callRevenue, color: getColor('Call Consultation') },
            { category: 'Puja', amount: pujaRevenue, color: getColor('Puja Rituals') },
        ].filter(item => item.amount > 0);

        const totalBreakdownAmount = breakdownData.reduce((sum, item) => sum + item.amount, 0);
        const revenueBreakdown = breakdownData
            .map(item => ({
                ...item,
                percentage: totalBreakdownAmount > 0 ? Math.round((item.amount / totalBreakdownAmount) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        // Wallet and Stats
        const walletBalance = await this.walletFacade.getBalance(userId);
        const { totalWithdrawn } = await this.walletFacade.getWithdrawalsStatus(userId);
        const { data: transactions } = await this.walletFacade.getTransactions(userId, 5, 0, 'all');
        const recentTransactions = transactions.map(t => ({
            id: t.id.toString(),
            date: t.created_at,
            description: t.purpose,
            type: t.type.toLowerCase(),
            amount: Number(t.amount),
            status: 'completed'
        }));

        return {
            stats: {
                totalRevenue,
                consultations: consultationsCount,
                averageRating,
                growth,
                walletBalance: walletBalance || 0,
                totalWithdrawn: totalWithdrawn || 0,
                pujaRevenue,
                revenueGrowth: growth,
            },
            incomeTrends,
            revenueBreakdown,
            topUsers,
            topServices,
            recentTransactions
        };
    }
}
