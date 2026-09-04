import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { GetBankAccountUseCase } from './get-bank-account.usecase';
import { BankAccountPolicy } from '../policies/bank-account.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RemoveBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly getBankAccountUseCase: GetBankAccountUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(expertAccountId: string, id: string) {
    const account = await this.getBankAccountUseCase.execute(
      expertAccountId,
      id,
    );

    BankAccountPolicy.ensureCanDelete(account);

    await this.bankAccountRepo.remove(account);

    this.eventEmitter.emit('expert.bank-account.removed', {
      expertAccountId: account.expert?.id || expertAccountId,
      accountId: id,
    });

    return new BooleanMessage();
  }
}
