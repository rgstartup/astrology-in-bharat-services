import { Injectable } from '@nestjs/common';
import { GetAdminDashboardStatsUseCase } from './use-cases/get-admin-dashboard-stats.use-case';
import { GetAdminUserGrowthStatsUseCase } from './use-cases/get-admin-user-growth-stats.use-case';
import { GetExpertDetailUseCase } from './use-cases/get-expert-detail.use-case';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { WithdrawalStatus } from '@/modules/wallet/infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class AdminFacade {
  constructor(
    private readonly getDashboardStatsUseCase: GetAdminDashboardStatsUseCase,
    private readonly getUserGrowthStatsUseCase: GetAdminUserGrowthStatsUseCase,
    private readonly getExpertDetailUseCase: GetExpertDetailUseCase,
    private readonly chatFacade: ChatFacade,
    private readonly walletFacade: WalletFacade,
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
}
