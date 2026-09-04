import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';

@Injectable()
export class GetBankAccountUseCase {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
  ) {}

  async execute(expertAccountId: string, id: string) {
    const account = await this.bankAccountRepo.findOne({
      where: { id, expert: { id: expertAccountId } },
      relations: { expert: { user: true } },
    });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }
}
