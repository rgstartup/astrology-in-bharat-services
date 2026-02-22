import { Injectable } from '@nestjs/common';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { CreateProfileExpertDto, UpdateProfileExpertDto } from '../api/dto/profile-expert.dto';
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

@Injectable()
export class ProfileFacade {
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
  ) {}

  async getProfile(user: User) {
    return this.getProfileUseCase.execute(user);
  }

  async createProfile(user: User, dto: CreateProfileExpertDto) {
    return this.createProfileUseCase.execute(user, dto);
  }

  async updateProfile(user: User, dto: UpdateProfileExpertDto) {
    return this.updateProfileUseCase.execute(user, dto);
  }

  async updateStatus(user: User, isAvailable: boolean) {
    return this.updateStatusUseCase.execute(user, isAvailable);
  }

  async listExperts(query: QueryExpertDto) {
    return this.listExpertsUseCase.execute(query);
  }

  async getExpertById(id: number) {
    return this.getExpertByIdUseCase.execute(id);
  }

  async updateKycStatus(expertId: number, status: string, reason?: string) {
    return this.updateKycStatusUseCase.execute(expertId, status, reason);
  }

  async getTopRatedExperts(limit: number = 3) {
    return this.getTopRatedExpertsUseCase.execute(limit);
  }

  async getExpertByUserId(userId: number) {
    return this.getExpertByUserIdUseCase.execute(userId);
  }
}
