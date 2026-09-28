import { Injectable } from '@nestjs/common';
import { ClientWallet } from '../entities/client-wallet.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class GetClientWalletUseCase {
  constructor(
    @InjectRepository(ClientWallet)
    private readonly clientWalletRepo: Repository<ClientWallet>,
  ) {}

  async execute(clientId: number): Promise<ClientWallet> {
    const existingWallet = await this.clientWalletRepo.findOne({
      where: { client_id: clientId },
    });

    if (existingWallet) {
      return existingWallet;
    }

    const newWallet = this.clientWalletRepo.create({
      client_id: clientId,
      balance: 0,
      reserved_balance: 0,
    });

    return this.clientWalletRepo.save(newWallet);
  }
}
