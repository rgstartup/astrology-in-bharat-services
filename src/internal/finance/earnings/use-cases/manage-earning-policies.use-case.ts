import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EarningPolicy } from '../entities/earning-policy.entity';
import { EarningTier } from '../entities/earning-tier.entity';
import { CreateEarningPolicyDto } from '../dto/create-earning-policy.dto';

@Injectable()
export class ManageEarningPoliciesUseCase {
  constructor(
    @InjectRepository(EarningPolicy)
    private readonly policyRepo: Repository<EarningPolicy>,
    @InjectRepository(EarningTier)
    private readonly tierRepo: Repository<EarningTier>,
  ) {}

  async createPolicy(dto: CreateEarningPolicyDto): Promise<EarningPolicy> {
    const policy = this.policyRepo.create({
      ...dto,
      tiers: dto.tiers ? dto.tiers.map((t) => this.tierRepo.create(t)) : [],
    });
    return this.policyRepo.save(policy);
  }

  async listPolicies(): Promise<EarningPolicy[]> {
    return this.policyRepo.find({
      relations: ['tiers'],
      order: { priority: 'DESC', created_at: 'DESC' },
    });
  }

  async getPolicyById(id: number): Promise<EarningPolicy> {
    const policy = await this.policyRepo.findOne({
      where: { id },
      relations: ['tiers'],
    });
    if (!policy) throw new NotFoundException('Earning policy not found');
    return policy;
  }
}
