import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/persistence/entities/bank-account.entity';
import { GetBankAccountUseCase } from './get-bank-account.usecase';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrimaryBankAccountChangedEvent } from '../../domain/events/bank-account-events';

@Injectable()
export class SetPrimaryBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly getBankAccountUseCase: GetBankAccountUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(userId: number, id: number) {
    const account = await this.getBankAccountUseCase.execute(userId, id);

    // Find old primary account
    const oldPrimary = await this.bankAccountRepo.findOne({
      where: { expert_id: account.expert_id, is_primary: true },
    });

    await this.bankAccountRepo.update(
      { expert_id: account.expert_id },
      { is_primary: false },
    );

    account.is_primary = true;
    const updatedAccount = await this.bankAccountRepo.save(account);

    this.eventEmitter.emit(
      'expert.bank-account.primary-changed',
      new PrimaryBankAccountChangedEvent(userId, oldPrimary?.id, updatedAccount.id),
    );

    return updatedAccount;
  }
}
