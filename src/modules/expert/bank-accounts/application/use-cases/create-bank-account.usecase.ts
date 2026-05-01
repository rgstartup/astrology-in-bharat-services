import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/persistence/entities/bank-account.entity';
import { CreateBankAccountDto } from '../../api/dto/bank-account.dto';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BankAccountCreatedEvent } from '../../domain/events/bank-account-events';

@Injectable()
export class CreateBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  private async getExpertProfile(userId: string) {
    const profile = await this.profileRepo.findOne({
      where: { better_auth_user_id: userId },
    });
    if (!profile) throw new NotFoundException('Expert profile not found');
    return profile;
  }

  async execute(userId: string, dto: CreateBankAccountDto) {
    const profile = await this.getExpertProfile(userId);

    // If this is the first account, it must be primary
    const count = await this.bankAccountRepo.count({
      where: { expert_id: profile.id },
    });
    if (count === 0) {
      dto.is_primary = true;
    }

    if (dto.is_primary) {
      await this.bankAccountRepo.update(
        { expert_id: profile.id },
        { is_primary: false },
      );
    }

    const account = this.bankAccountRepo.create({
      ...dto,
      expert_id: profile.id,
    });

    const savedAccount = (await this.bankAccountRepo.save(account)) as BankAccount;

    // Emit event
    this.eventEmitter.emit(
      'expert.bank-account.created',
      new BankAccountCreatedEvent(userId, savedAccount.id, savedAccount.account_holder_name),
    );

    return savedAccount;
  }
}
