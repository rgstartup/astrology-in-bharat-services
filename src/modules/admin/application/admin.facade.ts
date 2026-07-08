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
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { SupportFacade } from '@/modules/support/application/support.facade';
import { WithdrawalStatus } from '@/modules/finance/wallet/infrastructure/entities/withdrawal.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { DisputeStatus } from '@/modules/support/infrastructure/entities/dispute.entity';
import { GetSystemSettingsUseCase } from './use-cases/get-system-settings.use-case';

// New DTO imports
import { GetClientsDto } from '../api/dto/get-clients.dto';
import { GetExpertsDto } from '../api/dto/get-experts.dto';
import { GetLiveSessionsDto } from '../api/dto/get-live-sessions.dto';
import { TerminateSessionDto } from '../api/dto/terminate-session.dto';
import { GetWithdrawalsDto } from '../api/dto/get-withdrawals.dto';
import { UpdateWithdrawalStatusDto } from '../api/dto/update-withdrawal-status.dto';
import { UpdateExpertStatusDto } from '../api/dto/update-expert-status.dto';
import { AssignCouponBulkDto } from '../api/dto/assign-coupon-bulk.dto';
import { GetAdminMerchantsDto } from '../api/dto/get-merchants.dto';
import { GetAgentsDto } from '../api/dto/get-agents.dto';
import { GetAdminListingsDto } from '../api/dto/get-listings.dto';
import { GetDisputesDto } from '../api/dto/get-disputes.dto';
import { UpdateDisputeStatusDto } from '../api/dto/update-dispute-status.dto';

// New Use Case imports
import { GetAdminClientsUseCase } from './use-cases/get-admin-clients.use-case';
import { GetAdminExpertsUseCase } from './use-cases/get-admin-experts.use-case';
import { GetLiveSessionsUseCase } from './use-cases/get-live-sessions.use-case';
import { TerminateSessionUseCase } from './use-cases/terminate-session.use-case';
import { GetAdminWithdrawalsUseCase } from './use-cases/get-admin-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './use-cases/update-withdrawal-status.use-case';
import { UpdateExpertStatusUseCase } from './use-cases/update-expert-status.use-case';
import { GetAdminDisputesUseCase } from './use-cases/get-admin-disputes.use-case';
import { UpdateDisputeStatusUseCase } from './use-cases/update-dispute-status.use-case';

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

    // Injecting new use cases
    private readonly getAdminClientsUseCase: GetAdminClientsUseCase,
    private readonly getAdminExpertsUseCase: GetAdminExpertsUseCase,
    private readonly getLiveSessionsUseCase: GetLiveSessionsUseCase,
    private readonly terminateSessionUseCase: TerminateSessionUseCase,
    private readonly getAdminWithdrawalsUseCase: GetAdminWithdrawalsUseCase,
    private readonly updateWithdrawalStatusUseCase: UpdateWithdrawalStatusUseCase,
    private readonly updateExpertStatusUseCase: UpdateExpertStatusUseCase,
    private readonly getAdminDisputesUseCase: GetAdminDisputesUseCase,
    private readonly updateDisputeStatusUseCase: UpdateDisputeStatusUseCase,
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

  async getAllClients(dto: GetClientsDto) {
    return this.getAdminClientsUseCase.execute(dto);
  }

  async getAllExperts(dto: GetExpertsDto) {
    return this.getAdminExpertsUseCase.execute(dto);
  }

  async getLiveSessions(dto: GetLiveSessionsDto) {
    return this.getLiveSessionsUseCase.execute(dto);
  }

  async terminateSession(
    sessionId: string,
    adminId: string,
    dto: TerminateSessionDto,
  ) {
    return this.terminateSessionUseCase.execute(sessionId, adminId, dto);
  }

  async getWithdrawals(dto: GetWithdrawalsDto) {
    return this.getAdminWithdrawalsUseCase.execute(dto);
  }

  async updateWithdrawalStatus(
    id: string,
    adminId: string,
    dto: UpdateWithdrawalStatusDto,
  ) {
    return this.updateWithdrawalStatusUseCase.execute(id, adminId, dto);
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

  async assignCouponBulk(dto: AssignCouponBulkDto) {
    return this.assignCouponBulkUseCase.execute(dto);
  }

  async createAgent(dto: CreateAgentDto, files?: Record<string, unknown>) {
    return this.createAgentUseCase.execute(dto, files);
  }

  async getAgents(dto: GetAgentsDto) {
    return this.getAgentsUseCase.execute(dto);
  }

  async getAgentStats() {
    return this.getAgentStatsUseCase.execute();
  }

  async getListings(dto: GetAdminListingsDto) {
    return this.getAdminListingsUseCase.execute(dto);
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
  async getAllDisputes(dto: GetDisputesDto) {
    return this.getAdminDisputesUseCase.execute(dto);
  }

  async getDisputeById(disputeId: string) {
    return this.supportFacade.getDisputeByIdForAdmin(disputeId);
  }

  async updateDisputeStatus(id: string, dto: UpdateDisputeStatusDto) {
    return this.updateDisputeStatusUseCase.execute(id, dto);
  }

  async updateExpertStatus(id: string, dto: UpdateExpertStatusDto) {
    return this.updateExpertStatusUseCase.execute(id, dto);
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

  async getAllMerchants(dto: GetAdminMerchantsDto) {
    return this.getAdminMerchantsUseCase.execute(dto);
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
