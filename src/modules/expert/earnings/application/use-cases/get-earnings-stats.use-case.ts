import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession, CallSessionStatus, CallType } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';
import { Order, OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { PujaAppointment, PujaAppointmentStatus } from '@/modules/puja-appointment/infrastructure/persistence/entities/puja-appointment.entity';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';


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
        private walletFacade: WalletFacade,
        private userRepository: UserRepository,
    ) { }

    async execute(userId: string, range: string) {
        const expert = await this.expertRepo.findOne({
            where: { better_auth_user_id: userId },
        });
        if (!expert) return null;

        const localUser = await this.userRepository.findByBetterAuthId(userId);
        if (!localUser) return null;
        const numericUserId = localUser.id;

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

        const [sessions, calls, orderItems, pujas] = await Promise.all([
            this.sessionRepo.find({
                where: {
                    expert_id: expertId,
                    status: ChatSessionStatus.COMPLETED,
                    created_at: Between(startDate, new Date()),
                },
                relations: ['user'],
            }),
            this.callRepo.find({
                where: {
                    expert_id: expertId,
                    status: CallSessionStatus.COMPLETED,
                    created_at: Between(startDate, new Date()),
                },
                relations: ['user'],
            }),
            this.orderItemRepo.find({
                where: {
                    product: { expert_id: expertId },
                    order: { status: OrderStatus.PAID },
                    created_at: Between(startDate, new Date()),
                },
                relations: ['order', 'order.user', 'product'],
            }),
            this.pujaRepo.find({
                where: {
                    expert_id: expertId,
                    status: PujaAppointmentStatus.CONFIRMED,
                    created_at: Between(startDate, new Date()),
                },
                relations: ['user', 'puja'],
            })
        ]);

        const chatRevenue = sessions.reduce((acc, s) => acc + (s.total_cost || 0), 0);
        const callRevenue = calls.reduce((acc, c) => acc + (c.final_price || 0), 0);
        const productRevenue = orderItems.reduce((acc, oi) => acc + (Number(oi.price) * (oi.quantity || 1)), 0);
        const pujaRevenue = pujas.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
        
        const totalRevenue = chatRevenue + callRevenue + productRevenue + pujaRevenue;

        // Service Color Mapping
        const serviceColors: Record<string, string> = {
            "Chat Consultation": "#f59e0b",      // Amber
            "Video Call Consultation": "#8b5cf6", // Purple
            "Call Consultation": "#10b981",       // Green
            "Product Sales": "#ec4899",           // Pink
            "Puja Rituals": "#f97316",            // Orange
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
            const label = months[s.created_at.getMonth()];
            if (incomeTrendsMap.has(label)) {
                incomeTrendsMap.set(label, incomeTrendsMap.get(label) + (s.total_cost || 0));
            }
        });

        calls.forEach(c => {
            const label = months[c.created_at.getMonth()];
            if (incomeTrendsMap.has(label)) {
                incomeTrendsMap.set(label, incomeTrendsMap.get(label) + (c.final_price || 0));
            }
        });

        orderItems.forEach(oi => {
            const label = months[oi.created_at.getMonth()];
            if (incomeTrendsMap.has(label)) {
                incomeTrendsMap.set(label, incomeTrendsMap.get(label) + (Number(oi.price) * (oi.quantity || 1)));
            }
        });

        pujas.forEach(p => {
            const label = months[p.created_at.getMonth()];
            if (incomeTrendsMap.has(label)) {
                incomeTrendsMap.set(label, incomeTrendsMap.get(label) + (Number(p.price) || 0));
            }
        });

        const incomeTrends = Array.from(incomeTrendsMap, ([label, value]) => ({ label, value }));

        // Top Users
        const userStats = new Map();
        const updateTopUser = (userId: number, amount: number, userObj: any) => {
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
        orderItems.forEach(oi => updateTopUser(oi.order?.user_id, Number(oi.price) * (oi.quantity || 1), oi.order?.user));
        pujas.forEach(p => updateTopUser(p.user_id, Number(p.price) || 0, p.user));

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

        const serviceStatsMap = new Map();

        // Add Chat
        serviceStatsMap.set('Chat Consultation', {
            id: 'srv_chat',
            name: 'Chat Consultation',
            amount: chatRevenue,
            usage: sessions.length
        });

        // Add Calls
        const audioCalls = calls.filter(c => c.type === CallType.AUDIO);
        const videoCalls = calls.filter(c => c.type === CallType.VIDEO);

        if (audioCalls.length > 0 || (expert.call_price || 0) > 0) {
            serviceStatsMap.set('Call Consultation', {
                id: 'srv_call',
                name: 'Call Consultation',
                amount: audioCalls.reduce((acc, c) => acc + (c.final_price || 0), 0),
                usage: audioCalls.length
            });
        }

        if (videoCalls.length > 0 || (expert.video_call_price || 0) > 0) {
            serviceStatsMap.set('Video Call Consultation', {
                id: 'srv_video',
                name: 'Video Call Consultation',
                amount: videoCalls.reduce((acc, c) => acc + (c.final_price || 0), 0),
                usage: videoCalls.length
            });
        }

        // Add Products
        if (orderItems.length > 0) {
            serviceStatsMap.set('Product Sales', {
                id: 'srv_products',
                name: 'Product Sales',
                amount: productRevenue,
                usage: orderItems.length
            });
        }

        // Add Pujas
        if (pujas.length > 0) {
            serviceStatsMap.set('Puja Rituals', {
                id: 'srv_pujas',
                name: 'Puja Rituals',
                amount: pujaRevenue,
                usage: pujas.length
            });
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
            { category: 'Products', amount: productRevenue, color: getColor('Product Sales') },
            { category: 'Puja', amount: pujaRevenue, color: getColor('Puja Rituals') },
        ].filter(item => item.amount > 0);

        const totalBreakdownAmount = breakdownData.reduce((sum, item) => sum + item.amount, 0);
        const revenueBreakdown = breakdownData
            .map(item => ({
                ...item,
                percentage: totalBreakdownAmount > 0 ? Math.round((item.amount / totalBreakdownAmount) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        // Wallet Data
        const walletBalance = await this.walletFacade.getBalance(numericUserId);
        const { totalWithdrawn } = await this.walletFacade.getWithdrawalsStatus(numericUserId);

        // Recent Transactions
        const { items: transactions } = await this.walletFacade.getTransactions(numericUserId, 1, 5, 'all');
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
                walletBalance: walletBalance || 0,
                totalWithdrawn: totalWithdrawn || 0,
                pujaRevenue,
                revenueGrowth: 0,
                balanceGrowth: 0,
                withdrawalGrowth: 0,
            },
            incomeTrends,
            revenueBreakdown,
            topUsers,
            topServices,
            recentTransactions
        };
    }
}
