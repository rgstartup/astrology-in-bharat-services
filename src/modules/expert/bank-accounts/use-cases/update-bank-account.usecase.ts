import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { UpdateBankAccountDto } from '../dto/bank-account.dto';
import { GetBankAccountUseCase } from './get-bank-account.usecase';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BankAccountUpdatedEvent } from '../events/bank-account-events';

@Injectable()
export class UpdateBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly getBankAccountUseCase: GetBankAccountUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    expertProfileId: string,
    id: string,
    dto: UpdateBankAccountDto,
  ) {
    const account = await this.getBankAccountUseCase.execute(
      expertProfileId,
      id,
    );

    if (!account.expert) {
      throw new NotFoundException('No expert account associated');
    }

    if (dto.is_primary && !account.is_primary) {
      await this.bankAccountRepo
        .createQueryBuilder()
        .update(BankAccount)
        .set({ is_primary: false })
        .where('expert_id = :expertAccountId', {
          expertAccountId: account.expert.id,
        })
        .execute();
    }

    Object.assign(account, dto);
    const updatedAccount = await this.bankAccountRepo.save(account);

    this.eventEmitter.emit(
      'expert.bank-account.updated',
      new BankAccountUpdatedEvent(account.expert.id, updatedAccount.id),
    );

    return new BooleanMessage();
  }
}
