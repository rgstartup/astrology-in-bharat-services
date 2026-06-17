import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/entities/bank-account.entity';
import { GetBankAccountUseCase } from './get-bank-account.usecase';
import { BankAccountPolicy } from '../../domain/policies/bank-account.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RemoveBankAccountUseCase {
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

    BankAccountPolicy.ensureCanDelete(account);

    await this.bankAccountRepo.remove(account);

    this.eventEmitter.emit('expert.bank-account.removed', {
      userId: account.expert?.user_id || expertProfileId,
      accountId: id,
    });

    return new BooleanMessage();
  }
}
