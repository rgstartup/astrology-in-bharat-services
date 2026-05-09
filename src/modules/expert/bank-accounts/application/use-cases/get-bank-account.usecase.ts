import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/entities/bank-account.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

@Injectable()
export class GetBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) { }

  private async getExpertProfile(userId: number) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Expert profile not found');
    return profile;
  }

  async execute(userId: number, id: number) {
    const profile = await this.getExpertProfile(userId);
    const account = await this.bankAccountRepo.findOne({
      where: { id, expert_id: profile.id },
    });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }
}
