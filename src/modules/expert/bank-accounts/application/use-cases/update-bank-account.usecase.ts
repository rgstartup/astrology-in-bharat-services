import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/entities/bank-account.entity';
import { UpdateBankAccountDto } from '../../api/dto/bank-account.dto';
import { GetBankAccountUseCase } from './get-bank-account.usecase';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BankAccountUpdatedEvent } from '../../domain/events/bank-account-events';

@Injectable()
export class UpdateBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly getBankAccountUseCase: GetBankAccountUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(userId: string, id: string, dto: UpdateBankAccountDto) {
    const account = await this.getBankAccountUseCase.execute(userId, id);

    if(!account.expert || !account.expert_id){
        throw new NotFoundException('No Expert profile associated');
    }
    

    if (dto.is_primary && !account.is_primary) {
      await this.bankAccountRepo.update(
        { expert_id: account.expert_id },
        { is_primary: false },
      );
    }

    Object.assign(account, dto);
    const updatedAccount = await this.bankAccountRepo.save(account);

    this.eventEmitter.emit(
      'expert.bank-account.updated',
      new BankAccountUpdatedEvent(userId as any, updatedAccount.id),
    );

    return new BooleanMessage();
  }
}
