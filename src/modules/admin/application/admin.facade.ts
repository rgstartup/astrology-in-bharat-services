import { Injectable } from '@nestjs/common';
import { GetAdminDashboardStatsUseCase } from './use-cases/get-admin-dashboard-stats.use-case';
import { GetAdminUserGrowthStatsUseCase } from './use-cases/get-admin-user-growth-stats.use-case';
import { GetExpertDetailUseCase } from './use-cases/get-expert-detail.use-case';
import { GetFilteredUsersUseCase, FilterCriteria } from './use-cases/get-filtered-users.use-case';
import { AssignCouponBulkUseCase } from './use-cases/assign-coupon-bulk.use-case';
import { CreateAgentUseCase } from './use-cases/create-agent.use-case';
import { GetAgentsUseCase } from './use-cases/get-agents.use-case';
import { GetAgentStatsUseCase } from './use-cases/get-agent-stats.use-case';
import { GetAdminListingsUseCase } from './use-cases/get-admin-listings.use-case';
import { GetAdminRevenueTrendUseCase } from './use-cases/get-admin-revenue-trend.use-case';
import { GetAdminEarningsBreakdownUseCase } from './use-cases/get-admin-earnings-breakdown.use-case';
import { GetAdminTopExpertsUseCase } from './use-cases/get-admin-top-experts.use-case';
import { CreateAgentDto } from '../presentation/dto/create-agent.dto';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { SupportFacade } from '@/modules/support/application/support.facade';
import { WithdrawalStatus } from '@/modules/wallet/infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class AdminFacade {
  constructor(
    private readonly getDashboardStatsUseCase: GetAdminDashboardStatsUseCase,
    private readonly getUserGrowthStatsUseCase: GetAdminUserGrowthStatsUseCase,
    private readonly getExpertDetailUseCase: GetExpertDetailUseCase,
    private readonly getFilteredUsersUseCase: GetFilteredUsersUseCase,
    private readonly assignCouponBulkUseCase: AssignCouponBulkUseCase,
    private readonly createAgentUseCase: CreateAgentUseCase,
    private readonly getAgentsUseCase: GetAgentsUseCase,
    private readonly getAgentStatsUseCase: GetAgentStatsUseCase,
    private readonly getAdminListingsUseCase: GetAdminListingsUseCase,
    private readonly getRevenueTrendUseCase: GetAdminRevenueTrendUseCase,
    private readonly getEarningsBreakdownUseCase: GetAdminEarningsBreakdownUseCase,
    private readonly getTopExpertsUseCase: GetAdminTopExpertsUseCase,
    private readonly chatFacade: ChatFacade,
    private readonly walletFacade: WalletFacade,
    private readonly supportFacade: SupportFacade,
  ) { }


  async getDashboardStats() {
    return this.getDashboardStatsUseCase.execute();
  }

  async getUserGrowthStats(days: number = 7) {
    return this.getUserGrowthStatsUseCase.execute(days);
  }

  async getExpertDetail(id: number) {
    return this.getExpertDetailUseCase.execute(id);
  }

  async getLiveSessions(filter?: string, page?: number, limit?: number) {
    return this.chatFacade.findAllSessions(filter, page, limit);
  }


  async terminateSession(sessionId: number, adminId: number, userMessage?: string, expertMessage?: string) {
    return this.chatFacade.adminTerminateSession(sessionId, adminId, userMessage, expertMessage);
  }

  async getPendingWithdrawals(page?: number, limit?: number) {
    return this.walletFacade.getPendingWithdrawals(page, limit);
  }

  async updateWithdrawalStatus(id: number, status: WithdrawalStatus, adminId: number, remark?: string) {
    return this.walletFacade.updateWithdrawalStatus(id, status, adminId, remark);
  }

  async getWithdrawalStats() {
    return this.walletFacade.getAdminWithdrawalStats();
  }

  async getFilteredUsersCount(filters: FilterCriteria) {
    return this.getFilteredUsersUseCase.executeCount(filters);
  }

  async getFilteredUsersList(filters: FilterCriteria) {
    return this.getFilteredUsersUseCase.executeList(filters);
  }

  async assignCouponBulk(couponCode: string, filters: FilterCriteria) {
    return this.assignCouponBulkUseCase.execute(couponCode, filters);
  }

  async createAgent(dto: CreateAgentDto, files?: any) {
    return this.createAgentUseCase.execute(dto, files);
  }

  async getAgents(params: { page?: number; limit?: number; search?: string; status?: string }) {
    return this.getAgentsUseCase.execute(params);
  }

  async getAgentStats() {
    return this.getAgentStatsUseCase.execute();
  }
 
  async getListings(params?: any) {
    return this.getAdminListingsUseCase.execute(params);
  }

  async getRevenueTrend(days: number = 7) {
    return this.getRevenueTrendUseCase.execute(days);
  }

  async getEarningsBreakdown(days: number = 7) {
    return this.getEarningsBreakdownUseCase.execute(days);
  }

  async getTopExperts(limit: number = 5) {
    return this.getTopExpertsUseCase.execute(limit);
  }

  // --- Support / Disputes Management ---
  async getAllDisputes(params?: { status?: string, page?: number, limit?: number }) {
    return this.supportFacade.getAllDisputes(params);
  }

  async getDisputeById(disputeId: number) {
    return this.supportFacade.getDisputeByIdForAdmin(disputeId);
  }

  async updateDisputeStatus(disputeId: number, status: string, notes?: string) {
    return this.supportFacade.updateDisputeStatus(disputeId, { status, notes });
  }

  async getDisputeMessages(disputeId: number) {
    return this.supportFacade.getAdminMessages(disputeId);
  }

  async sendDisputeMessage(disputeId: number, adminId: number, data: { message: string }) {
    return this.supportFacade.sendAdminMessage(adminId, disputeId, data);
  }
}

