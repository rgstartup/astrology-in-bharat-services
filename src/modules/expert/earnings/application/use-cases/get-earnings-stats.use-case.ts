import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { GetExpertPujasByDateUseCase } from '@/modules/puja-appointment/application/use-cases/get-expert-pujas-by-date.use-case';
import { ReviewsFacade } from '@/modules/consultation/reviews/application/reviews.facade';
import { CallType } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

import { GetExpertEarningsStatsDto } from '../../api/dto/get-expert-earnings-stats.dto';

@Injectable()
export class GetEarningsStatsUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private expertRepo: Repository<ProfileExpert>,
    private chatFacade: ChatFacade,
    private callFacade: CallFacade,
    private getExpertPujasByDateUseCase: GetExpertPujasByDateUseCase,
    private reviewsFacade: ReviewsFacade,
    private walletFacade: WalletFacade,
  ) {}

  async execute(
    expertProfileId: string,
    dto: GetExpertEarningsStatsDto,
  ) {
    const { period = 'last_6_months', startDate: startDateStr, endDate: endDateStr } = dto;
    const expert = await this.expertRepo.findOne({
      where: { id: expertProfileId },
    });
    if (!expert) return null;

    const expert_id = expert.id;

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
      this.chatFacade.getExpertSessionsByDate(
        expert_id as unknown as string,
        startDate,
        endDate,
      ),
      this.callFacade.getExpertCallsByDate(
        expert_id as unknown as string,
        startDate,
        endDate,
      ),
      this.getExpertPujasByDateUseCase.execute(
        expert_id as unknown as string,
        startDate,
        endDate,
      ),
      this.reviewsFacade.getExpertReviewsByDate(
        expert_id as unknown as string,
        startDate,
        endDate,
      ),
    ]);

    // --- Data Fetching (Previous Period for Growth) ---
    const [prevSessions, prevCalls, prevPujas] = await Promise.all([
      this.chatFacade.getExpertSessionsByDate(
        expert_id as unknown as string,
        prevStartDate,
        prevEndDate,
      ),
      this.callFacade.getExpertCallsByDate(
        expert_id as unknown as string,
        prevStartDate,
        prevEndDate,
      ),
      this.getExpertPujasByDateUseCase.execute(
        expert_id as unknown as string,
        prevStartDate,
        prevEndDate,
      ),
    ]);

    const chatRevenue = sessions.reduce(
      (acc, s) => acc + (s.total_cost || 0),
      0,
    );
    const callRevenue = calls.reduce((acc, c) => acc + (c.final_price || 0), 0);
    const pujaRevenue = pujas.reduce(
      (acc, p) => acc + (Number(p.price) || 0),
      0,
    );
    const totalRevenue = chatRevenue + callRevenue + pujaRevenue;

    const prevChatRevenue = prevSessions.reduce(
      (acc, s) => acc + (s.total_cost || 0),
      0,
    );
    const prevCallRevenue = prevCalls.reduce(
      (acc, c) => acc + (c.final_price || 0),
      0,
    );
    const prevPujaRevenue = prevPujas.reduce(
      (acc, p) => acc + (Number(p.price) || 0),
      0,
    );
    const prevTotalRevenue =
      prevChatRevenue + prevCallRevenue + prevPujaRevenue;

    const growth =
      prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
        : 0;
    const consultationsCount = sessions.length + calls.length + pujas.length;
    const average_rating =
      reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;

    // Service Color Mapping
    const serviceColors: Record<string, string> = {
      'Chat Consultation': '#f59e0b',
      'Video Call Consultation': '#8b5cf6',
      'Call Consultation': '#10b981',
      'Product Sales': '#ec4899',
      'Puja Rituals': '#f97316',
      'Report Generation': '#ef4444',
      'Horoscope Analysis': '#3b82f6',
      'Custom Service': '#6b7280',
    };
    const getColor = (name: string) => serviceColors[name] || '#6b7280';

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
        const label = d.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
        });
        incomeTrendsMap.set(label, 0);
      }
    } else {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const current = new Date(startDate);
      while (current <= endDate) {
        const label = months[current.getMonth()];
        incomeTrendsMap.set(label, 0);
        current.setMonth(current.getMonth() + 1);
      }
    }

    const addDataToTrends = (
      items: Record<string, unknown>[],
      priceFn: (item: Record<string, unknown>) => number,
    ) => {
      items.forEach((item) => {
        let label: string;
        const createdAt = item.created_at as Date;
        if (period === 'today') {
          label = `${createdAt.getHours().toString().padStart(2, '0')}:00`;
        } else if (rangeDays <= 31) {
          label = createdAt.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
          });
        } else {
          const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          label = months[createdAt.getMonth()];
        }
        if (incomeTrendsMap.has(label)) {
          incomeTrendsMap.set(
            label,
            (incomeTrendsMap.get(label) || 0) + priceFn(item),
          );
        }
      });
    };

    addDataToTrends(
      sessions as unknown as Record<string, unknown>[],
      (s) => (s.total_cost as number) || 0,
    );
    addDataToTrends(
      calls as unknown as Record<string, unknown>[],
      (c) => (c.final_price as number) || 0,
    );
    addDataToTrends(
      pujas as unknown as Record<string, unknown>[],
      (p) => Number(p.price) || 0,
    );

    const incomeTrends = Array.from(incomeTrendsMap, ([label, value]) => ({
      label,
      value,
    }));

    // Top Users
    const userStats = new Map<
      string,
      {
        id: string;
        name: string;
        avatar: string;
        amount: number;
        sessions: number;
      }
    >();
    const updateTopUser = (
      userId: string,
      amount: number,
      userObj: { name?: string; avatar?: string } | null,
    ) => {
      if (!userId) return;
      const userData = userStats.get(userId) || {
        id: userId,
        name: userObj?.name || 'Unknown',
        avatar: userObj?.avatar || '',
        amount: 0,
        sessions: 0,
      };
      userData.amount += amount;
      userData.sessions += 1;
      userStats.set(userId, userData);
    };

    sessions.forEach((s) =>
      updateTopUser(
        s.expert_id as unknown as string,
        s.total_cost || 0,
        s.expert as { name?: string; avatar?: string } | null,
      ),
    );
    calls.forEach((c) =>
      updateTopUser(
        c.expert_id as unknown as string,
        c.final_price || 0,
        c.expert as { name?: string; avatar?: string } | null,
      ),
    );
    pujas.forEach((p) =>
      updateTopUser(
        p.client?.id as unknown as string,
        Number(p.price) || 0,
        p.client?.user as { name?: string; avatar?: string } | null,
      ),
    );

    const topUsers = Array.from(userStats.values())
      .sort((a, b) => b.amount - a.amount)
      .map((u) => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        total_spent: u.amount,
        sessions: u.sessions,
      }))
      .slice(0, 5);

    // Top Services
    const serviceStatsMap = new Map<
      string,
      { id: string; name: string; amount: number; usage: number }
    >();
    serviceStatsMap.set('Chat Consultation', {
      id: 'srv_chat',
      name: 'Chat Consultation',
      amount: chatRevenue,
      usage: sessions.length,
    });

    const audioCalls = calls.filter((c) => c.type === CallType.AUDIO);
    const videoCalls = calls.filter((c) => c.type === CallType.VIDEO);
    if (audioCalls.length > 0 || (expert.call_price || 0) > 0) {
      serviceStatsMap.set('Call Consultation', {
        id: 'srv_call',
        name: 'Call Consultation',
        amount: audioCalls.reduce((acc, c) => acc + (c.final_price || 0), 0),
        usage: audioCalls.length,
      });
    }
    if (videoCalls.length > 0 || (expert.video_call_price || 0) > 0) {
      serviceStatsMap.set('Video Call Consultation', {
        id: 'srv_video',
        name: 'Video Call Consultation',
        amount: videoCalls.reduce((acc, c) => acc + (c.final_price || 0), 0),
        usage: videoCalls.length,
      });
    }
    if (pujas.length > 0) {
      serviceStatsMap.set('Puja Rituals', {
        id: 'srv_pujas',
        name: 'Puja Rituals',
        amount: pujaRevenue,
        usage: pujas.length,
      });
    }

    const topServices = Array.from(serviceStatsMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((s) => ({
        id: s.id,
        name: s.name,
        revenue: s.amount,
        usage_count: s.usage,
        color: getColor(s.name),
      }));

    // Revenue Breakdown
    const breakdownData = [
      {
        category: 'Chat',
        amount: chatRevenue,
        color: getColor('Chat Consultation'),
      },
      {
        category: 'Call',
        amount: callRevenue,
        color: getColor('Call Consultation'),
      },
      {
        category: 'Puja',
        amount: pujaRevenue,
        color: getColor('Puja Rituals'),
      },
    ].filter((item) => item.amount > 0);

    const totalBreakdownAmount = breakdownData.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const revenueBreakdown = breakdownData
      .map((item) => ({
        ...item,
        percentage:
          totalBreakdownAmount > 0
            ? Math.round((item.amount / totalBreakdownAmount) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Wallet and Stats
    const wallet_balance = await this.walletFacade.getBalance(
      expert_id,
      'expert_id',
    );
    const { total_withdrawn } = await this.walletFacade.getWithdrawalsStatus(
      expert_id,
      'expert_id',
    );
    const { data: transactions } = await this.walletFacade.getTransactions(
      expert_id,
      'expert_id',
      '5',
      '0',
      'all',
    );
    const recentTransactions = transactions.map((t) => ({
      id: t.id.toString(),
      date: t.created_at,
      description: t.purpose,
      type: t.type.toLowerCase(),
      amount: Number(t.amount),
      status: 'completed',
    }));

    return {
      stats: {
        totalRevenue: totalRevenue,
        consultations: consultationsCount,
        averageRating: average_rating,
        growth: growth,
        walletBalance: wallet_balance || 0,
        totalWithdrawn: total_withdrawn || 0,
        pujaRevenue: pujaRevenue,
        revenueGrowth: growth,
      },
      incomeTrends: incomeTrends,
      revenueBreakdown: revenueBreakdown,
      topUsers: topUsers,
      topServices: topServices,
      recentTransactions: recentTransactions,
    };
  }
}
