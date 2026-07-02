import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { IUser } from '@/common/types/access-token.payload';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from '../api/dto/profile-expert.dto';
import { QueryExpertDto } from '../api/dto/query-expert.dto';
import { GetProfileUseCase } from './use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './use-cases/update-profile.usecase';
import { UpdateStatusUseCase } from './use-cases/update-status.usecase';
import { ListExpertsUseCase } from './use-cases/list-experts.usecase';
import { GetExpertByIdUseCase } from './use-cases/get-expert-by-id.usecase';
import { UpdateKycStatusUseCase } from './use-cases/update-kyc-status.usecase';
import { GetTopRatedExpertsUseCase } from './use-cases/get-top-rated-experts.usecase';
import { GetExpertByUserIdUseCase } from './use-cases/get-expert-by-user-id.usecase';
import { UpsertPujaUseCase } from './use-cases/puja/upsert-puja.usecase';
import { DeletePujaUseCase } from './use-cases/puja/delete-puja.usecase';
import { GetPujaByIdUseCase } from './use-cases/puja/get-puja-by-id.usecase';
import { ListAllPujasUseCase } from './use-cases/puja/list-all-pujas.usecase';
import { UpdatePujaLikesUseCase } from './use-cases/puja/update-puja-likes.usecase';
import { UpdateProfileWithQueryRunnerUseCase } from './use-cases/update-profile-with-query-runner.usecase';
import { GetExpertDetailUseCase } from './use-cases/get-admin-expert-detail.use-case';

import { ExpertPujaDto } from '../api/dto/expert-puja.dto';

@Injectable()
export class ExpertProfileFacade {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly createProfileUseCase: CreateProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly updateStatusUseCase: UpdateStatusUseCase,
    private readonly listExpertsUseCase: ListExpertsUseCase,
    private readonly getExpertByIdUseCase: GetExpertByIdUseCase,
    private readonly updateKycStatusUseCase: UpdateKycStatusUseCase,
    private readonly getTopRatedExpertsUseCase: GetTopRatedExpertsUseCase,
    private readonly getExpertByUserIdUseCase: GetExpertByUserIdUseCase,
    private readonly upsertPujaUseCase: UpsertPujaUseCase,
    private readonly deletePujaUseCase: DeletePujaUseCase,
    private readonly getPujaByIdUseCase: GetPujaByIdUseCase,
    private readonly listAllPujasUseCase: ListAllPujasUseCase,
    private readonly updatePujaLikesUseCase: UpdatePujaLikesUseCase,
    private readonly updateProfileWithQueryRunnerUseCase: UpdateProfileWithQueryRunnerUseCase,
    private readonly getExpertDetailUseCase: GetExpertDetailUseCase,
  ) {}

  async getProfile(user: IUser, queryRunner?: QueryRunner) {
    return this.getProfileUseCase.execute(user, queryRunner);
  }

  async createProfile(
    user: IUser,
    dto: CreateProfileExpertDto,
    queryRunner?: QueryRunner,
  ) {
    return this.createProfileUseCase.execute(user, dto, queryRunner);
  }

  async updateProfile(user: IUser, dto: UpdateProfileExpertDto) {
    return this.updateProfileUseCase.execute(user, dto);
  }

  async updateStatus(user: IUser, isAvailable: boolean) {
    return this.updateStatusUseCase.execute(user, isAvailable);
  }

  async listExperts(query: QueryExpertDto) {
    return this.listExpertsUseCase.execute(query);
  }

  async getExpertById(id: string) {
    return this.getExpertByIdUseCase.execute(id);
  }

  async updateKycStatus(expert_id: string, status: string, reason?: string) {
    return this.updateKycStatusUseCase.execute(expert_id, status, reason);
  }

  async getTopRatedExperts(limit: number = 3) {
    return this.getTopRatedExpertsUseCase.execute(limit);
  }

  async getExpertByUserId(userId: string, queryRunner?: QueryRunner) {
    return this.getExpertByUserIdUseCase.execute(userId, queryRunner);
  }

  async upsertPuja(user: IUser, dto: ExpertPujaDto, id?: string) {
    return this.upsertPujaUseCase.execute(user, dto, id);
  }

  async deletePuja(user: IUser, id: string) {
    return this.deletePujaUseCase.execute(user, id);
  }

  async listAllPujas() {
    return this.listAllPujasUseCase.execute();
  }

  async getPujaById(id: string) {
    return this.getPujaByIdUseCase.execute(id);
  }

  async updateProfileWithQueryRunner(
    userId: string,
    updates: import('typeorm/query-builder/QueryPartialEntity').QueryDeepPartialEntity<
      import('../infrastructure/entities/profile-expert.entity').ProfileExpert
    >,
    queryRunner: QueryRunner,
  ) {
    return this.updateProfileWithQueryRunnerUseCase.execute(
      userId,
      updates,
      queryRunner,
    );
  }

  async updatePujaLikes(pujaId: string, diff: number) {
    return this.updatePujaLikesUseCase.execute(pujaId, diff);
  }

  async getAdminExpertDetails(id: string) {
    return this.getExpertDetailUseCase.execute(id);
  }
}
