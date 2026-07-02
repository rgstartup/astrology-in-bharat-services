import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { GetAdminDashboardStatsUseCase } from './use-cases/get-admin-dashboard-stats.use-case';
import { GetAdminUserGrowthStatsUseCase } from './use-cases/get-admin-user-growth-stats.use-case';
import { GetExpertDetailUseCase } from './use-cases/get-expert-detail.use-case';
import {
  GetFilteredUsersUseCase,
  FilterCriteria,
} from './use-cases/get-filtered-users.use-case';
import { AssignCouponBulkUseCase } from './use-cases/assign-coupon-bulk.use-case';
import { CreateAgentUseCase } from './use-cases/create-agent.use-case';
import { GetAgentsUseCase } from './use-cases/get-agents.use-case';
import { GetAgentStatsUseCase } from './use-cases/get-agent-stats.use-case';
import { GetAdminListingsUseCase } from './use-cases/get-admin-listings.use-case';
import { GetAdminRevenueTrendUseCase } from './use-cases/get-admin-revenue-trend.use-case';
import { GetAdminEarningsBreakdownUseCase } from './use-cases/get-admin-earnings-breakdown.use-case';
import { GetAdminTopExpertsUseCase } from './use-cases/get-admin-top-experts.use-case';
import { GetAdminMerchantsUseCase } from './use-cases/get-admin-merchants.use-case';
import { UpdateMerchantStatusAdminUseCase } from './use-cases/update-merchant-status-admin.use-case';
import { UpdateListingStatusAdminUseCase } from './use-cases/update-listing-status-admin.use-case';
import { GetAdminMerchantSalesOverviewUseCase } from './use-cases/get-admin-merchant-sales-overview.use-case';
import { GetAdminMerchantSalesDetailsUseCase } from './use-cases/get-admin-merchant-sales-details.use-case';
import { CreateAgentDto } from '../api/dto/create-agent.dto';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { SupportFacade } from '@/modules/support/application/support.facade';
import { WithdrawalStatus } from '@/modules/wallet/infrastructure/entities/withdrawal.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { DisputeStatus } from '@/modules/support/infrastructure/entities/dispute.entity';
import { GetSystemSettingsUseCase } from './use-cases/get-system-settings.use-case';

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
    private readonly updateListingStatusAdminUseCase: UpdateListingStatusAdminUseCase,
    private readonly getRevenueTrendUseCase: GetAdminRevenueTrendUseCase,
    private readonly getEarningsBreakdownUseCase: GetAdminEarningsBreakdownUseCase,
    private readonly getTopExpertsUseCase: GetAdminTopExpertsUseCase,
    private readonly getAdminMerchantsUseCase: GetAdminMerchantsUseCase,
    private readonly updateMerchantStatusAdminUseCase: UpdateMerchantStatusAdminUseCase,
    private readonly getMerchantSalesOverviewUseCase: GetAdminMerchantSalesOverviewUseCase,
    private readonly getMerchantSalesDetailsUseCase: GetAdminMerchantSalesDetailsUseCase,
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @Inject(forwardRef(() => SupportFacade))
    private readonly supportFacade: SupportFacade,
    private readonly getSystemSettingsUseCase: GetSystemSettingsUseCase,
  ) {}

  async getDashboardStats() {
    return this.getDashboardStatsUseCase.execute();
  }

  async getUserGrowthStats(days: number = 7) {
    return this.getUserGrowthStatsUseCase.execute(days);
  }

  async getExpertDetail(id: string) {
    return this.getExpertDetailUseCase.execute(id);
  }

  async getLiveSessions(filter?: string, page?: number, limit?: number) {
    return this.chatFacade.findAllSessions(filter, page, limit);
  }

  async terminateSession(
    sessionId: string,
    adminId: string,
    userMessage?: string,
    expertMessage?: string,
  ) {
    return this.chatFacade.adminTerminateSession(
      sessionId,
      adminId,
      userMessage,
      expertMessage,
    );
  }

  async getWithdrawals(
    page: number = 1,
    limit: number = 10,
    status?: WithdrawalStatus,
    role?: RoleEnum,
  ) {
    const offset = (page - 1) * limit;
    return this.walletFacade.getPendingWithdrawals(limit, offset, status, role);
  }

  async updateWithdrawalStatus(
    id: string,
    status: WithdrawalStatus,
    adminId: string,
    remark?: string,
  ) {
    return this.walletFacade.updateWithdrawalStatus(
      id,
      status,
      adminId,
      remark,
    );
  }

  async getWithdrawalStats(role?: RoleEnum) {
    return this.walletFacade.getAdminWithdrawalStats(role);
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

  async createAgent(dto: CreateAgentDto, files?: Record<string, unknown>) {
    return this.createAgentUseCase.execute(dto, files);
  }

  async getAgents(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    return this.getAgentsUseCase.execute(params);
  }

  async getAgentStats() {
    return this.getAgentStatsUseCase.execute();
  }

  async getListings(params?: Record<string, unknown>) {
    return this.getAdminListingsUseCase.execute(params);
  }

  async updateListingStatus(id: string, status: string) {
    return this.updateListingStatusAdminUseCase.execute(id, { status });
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
  async getAllDisputes(params?: {
    status?: DisputeStatus;
    page?: number;
    limit?: number;
  }) {
    return this.supportFacade.getAllDisputes(params);
  }

  async getDisputeById(disputeId: string) {
    return this.supportFacade.getDisputeByIdForAdmin(disputeId);
  }

  async updateDisputeStatus(
    disputeId: string,
    status: DisputeStatus,
    notes?: string,
  ) {
    return this.supportFacade.updateDisputeStatus(disputeId, { status, notes });
  }

  async getDisputeMessages(disputeId: string) {
    return this.supportFacade.getAdminMessages(disputeId);
  }

  async sendDisputeMessage(
    disputeId: string,
    adminId: string,
    data: { message: string },
  ) {
    return this.supportFacade.sendAdminMessage(adminId, disputeId, data);
  }

  async getAllMerchants(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.getAdminMerchantsUseCase.execute(params);
  }

  async updateMerchantStatus(
    id: string,
    data: { status: string; kycStatus?: string },
  ) {
    return this.updateMerchantStatusAdminUseCase.execute(id, data);
  }

  async getMerchantSalesOverview() {
    return this.getMerchantSalesOverviewUseCase.execute();
  }

  async getMerchantSalesDetails(merchantId: string) {
    return this.getMerchantSalesDetailsUseCase.execute(merchantId);
  }

  async getSystemSettings(keys?: string[]) {
    return this.getSystemSettingsUseCase.execute(keys);
  }
}
