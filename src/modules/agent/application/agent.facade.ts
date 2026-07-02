import { Injectable } from '@nestjs/common';
import { GetAgentProfileUseCase } from './use-cases/get-agent-profile.use-case';
import { UpdateAgentProfileUseCase } from './use-cases/update-agent-profile.use-case';
import { GetAgentStatsUseCase } from './use-cases/get-agent-stats.use-case';
import { GetAgentListingsUseCase } from './use-cases/get-agent-listings.use-case';
import { GetAgentCommissionsUseCase } from './use-cases/get-agent-commissions.use-case';
import { SettleAgentCommissionsUseCase } from './use-cases/settle-agent-commissions.use-case';
import { CreateAgentListingUseCase } from './use-cases/create-agent-listing.use-case';
import { IncrementRegistrationsWithQueryRunnerUseCase } from './use-cases/increment-registrations-with-query-runner.usecase';
import { UpdateAgentProfileWithQueryRunnerUseCase } from './use-cases/update-agent-profile-with-query-runner.usecase';
import { GetAdminAgentsUseCase } from './use-cases/get-admin-agents.use-case';
import { GetAdminAgentStatsUseCase } from './use-cases/get-admin-agent-stats.use-case';
import { GetAdminListingsUseCase } from './use-cases/get-admin-listings.use-case';
import { UpdateAdminListingStatusUseCase } from './use-cases/update-admin-listing-status.use-case';
import { DateRangeDto } from '@/common/dto/date-range.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryRunner } from 'typeorm';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class AgentFacade {
  constructor(
    private readonly getAgentProfileUseCase: GetAgentProfileUseCase,
    private readonly updateAgentProfileUseCase: UpdateAgentProfileUseCase,
    private readonly getAgentStatsUseCase: GetAgentStatsUseCase,
    private readonly getAgentListingsUseCase: GetAgentListingsUseCase,
    private readonly getAgentCommissionsUseCase: GetAgentCommissionsUseCase,
    private readonly settleAgentCommissionsUseCase: SettleAgentCommissionsUseCase,
    private readonly createAgentListingUseCase: CreateAgentListingUseCase,
    private readonly incrementRegistrationsWithQueryRunnerUseCase: IncrementRegistrationsWithQueryRunnerUseCase,
    private readonly updateAgentProfileWithQueryRunnerUseCase: UpdateAgentProfileWithQueryRunnerUseCase,
    private readonly getAdminAgentsUseCase: GetAdminAgentsUseCase,
    private readonly getAdminAgentStatsUseCase: GetAdminAgentStatsUseCase,
    private readonly getAdminListingsUseCase: GetAdminListingsUseCase,
    private readonly updateAdminListingStatusUseCase: UpdateAdminListingStatusUseCase,
  ) {}

  async getProfile(user: IUser) {
    return this.getAgentProfileUseCase.execute(user);
  }

  async updateProfile(user: IUser, body: Record<string, unknown>) {
    return this.updateAgentProfileUseCase.execute(user, body);
  }

  async getStats(
    user: IUser,
    range: string = '30d',
    dateRangeDto?: DateRangeDto,
  ) {
    return this.getAgentStatsUseCase.execute(user, range, dateRangeDto);
  }

  async getListings(
    user: IUser,
    pagination: PaginationDto,
    type?: string,
    search?: string,
  ) {
    return this.getAgentListingsUseCase.execute(
      user,
      pagination,
      type,
      search,
    );
  }

  async getCommissions(userId: string, pagination: PaginationDto) {
    return this.getAgentCommissionsUseCase.execute(userId, pagination);
  }

  async settleCommissions(userId: string) {
    return this.settleAgentCommissionsUseCase.execute(userId);
  }

  async createListing(userId: string, body: Record<string, unknown>) {
    return this.createAgentListingUseCase.execute(userId, body);
  }

  async incrementRegistrationsWithQueryRunner(
    agentId: string,
    registeredUserId: string,
    isExpert: boolean,
    queryRunner: QueryRunner,
  ) {
    return this.incrementRegistrationsWithQueryRunnerUseCase.execute(
      agentId,
      registeredUserId,
      isExpert,
      queryRunner,
    );
  }

  async updateProfileWithQueryRunner(
    agentId: string,
    updates: Record<string, unknown>,
    queryRunner: QueryRunner,
  ) {
    return this.updateAgentProfileWithQueryRunnerUseCase.execute(
      agentId,
      updates,
      queryRunner,
    );
  }

  async getAdminAgents(params: Record<string, unknown>) {
    return this.getAdminAgentsUseCase.execute(params);
  }

  async getAdminAgentStats() {
    return this.getAdminAgentStatsUseCase.execute();
  }

  async getAdminListings(params: Record<string, unknown>) {
    return this.getAdminListingsUseCase.execute(params);
  }

  async updateAdminListingStatus(id: string, data: { status: string }) {
    return this.updateAdminListingStatusUseCase.execute(id, data);
  }
}
