import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/entities/bank-account.entity';

@Injectable()
export class ListBankAccountsUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
  ) {}

  async execute(expertProfileId: string) {
    return this.bankAccountRepo.find({
      where: { expert_id: expertProfileId },
      order: { is_primary: 'DESC', created_at: 'DESC' },
    });
  }
}
