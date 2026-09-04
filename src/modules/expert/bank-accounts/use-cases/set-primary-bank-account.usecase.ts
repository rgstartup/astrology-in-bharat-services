import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { GetBankAccountUseCase } from './get-bank-account.usecase';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrimaryBankAccountChangedEvent } from '../events/bank-account-events';

@Injectable()
export class SetPrimaryBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly getBankAccountUseCase: GetBankAccountUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(expertProfileId: string, id: string) {
    const account = await this.getBankAccountUseCase.execute(
      expertProfileId,
      id,
    );

    if (!account.expert) {
      throw new NotFoundException('No expert account associated');
    }

    // Find old primary account
    const oldPrimary = await this.bankAccountRepo.findOne({
      where: { expert: { id: account.expert.id }, is_primary: true },
    });

    await this.bankAccountRepo
      .createQueryBuilder()
      .update(BankAccount)
      .set({ is_primary: false })
      .where('expert_id = :expertAccountId', {
        expertAccountId: account.expert.id,
      })
      .execute();

    account.is_primary = true;
    const updatedAccount = await this.bankAccountRepo.save(account);

    this.eventEmitter.emit(
      'expert.bank-account.primary-changed',
      new PrimaryBankAccountChangedEvent(
        account.expert.id,
        oldPrimary?.id,
        updatedAccount.id,
      ),
    );

    return new BooleanMessage();
  }
}
