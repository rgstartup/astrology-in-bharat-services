import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
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
import { UpsertPujaUseCase } from './use-cases/puja/upsert-puja.usecase';
import { DeletePujaUseCase } from './use-cases/puja/delete-puja.usecase';
import { GetPujaByIdUseCase } from './use-cases/puja/get-puja-by-id.usecase';
import { ListAllPujasUseCase } from './use-cases/puja/list-all-pujas.usecase';


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


  ) { }

  async getProfile(userId: string, queryRunner?: QueryRunner) {
    return this.getProfileUseCase.execute(userId, queryRunner);
  }

  async createProfile(userId: string, dto: CreateProfileExpertDto, queryRunner?: QueryRunner) {
    return this.createProfileUseCase.execute(userId, dto, queryRunner);
  }

  async updateProfile(userId: string, dto: UpdateProfileExpertDto) {
    return this.updateProfileUseCase.execute(userId, dto);
  }

  async updateStatus(userId: string, isAvailable: boolean) {
    return this.updateStatusUseCase.execute(userId, isAvailable);
  }

  async listExperts(query: QueryExpertDto) {
    return this.listExpertsUseCase.execute(query);
  }

  async getExpertById(id: number) {
    return this.getExpertByIdUseCase.execute(id);
  }

  async updateKycStatus(userId: number, status: string, reason?: string) {
    return this.updateKycStatusUseCase.execute(userId, status, reason);
  }

  async getTopRatedExperts(limit: number = 3) {
    return this.getTopRatedExpertsUseCase.execute(limit);
  }

  async getExpertByUserId(userId: string, queryRunner?: QueryRunner) {
    return this.getExpertByUserIdUseCase.execute(userId, queryRunner);
  }

  async upsertPuja(userId: string, dto: ExpertPujaDto, id?: number) {
    return this.upsertPujaUseCase.execute(userId, dto, id);
  }

  async deletePuja(userId: string, id: number) {
    return this.deletePujaUseCase.execute(userId, id);
  }


  async listAllPujas() {
    return this.listAllPujasUseCase.execute();
  }

  async getPujaById(id: number) {
    return this.getPujaByIdUseCase.execute(id);
  }


}
