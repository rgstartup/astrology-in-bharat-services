import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';

@Injectable()
export class GetWalletUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) { }

  async execute(userId: string): Promise<Wallet> {
    const { ProfileClient } = await import('../../../client/profile/infrastructure/entities/profile-client.entity');
    const { ProfileExpert } = await import('../../../expert/profile/infrastructure/entities/profile-expert.entity');
    const { ProfileMerchant } = await import('../../../merchant/profile/infrastructure/entities/profile-merchant.entity');
    const { ProfileAgent } = await import('../../../agent/infrastructure/entities/profile-agent.entity');

    let walletOwnerId = '';
    let queryKey = '';

    const expert = await this.walletRepository.manager.findOne(ProfileExpert, { where: { user: { id: userId } } });
    if (expert) { walletOwnerId = expert.id; queryKey = 'expert_id'; }
    
    if (!walletOwnerId) {
       const merchant = await this.walletRepository.manager.findOne(ProfileMerchant, { where: { user: { id: userId } } });
       if (merchant) { walletOwnerId = merchant.id; queryKey = 'merchant_id'; }
    }

    if (!walletOwnerId) {
       const agent = await this.walletRepository.manager.findOne(ProfileAgent, { where: { user: { id: userId } } });
       if (agent) { walletOwnerId = agent.id; queryKey = 'agent_id'; }
    }

    if (!walletOwnerId) {
       const client = await this.walletRepository.manager.findOne(ProfileClient, { where: { user: { id: userId } } });
       if (client) { walletOwnerId = client.id; queryKey = 'client_id'; }
    }

    let wallet = await this.walletRepository.findOne({ where: { [queryKey || 'client_id']: walletOwnerId } });
    if (!wallet && walletOwnerId && queryKey) {
      wallet = this.walletRepository.create({
        [queryKey]: walletOwnerId,
        balance: 0,
        reserved_balance: 0,
      });
      await this.walletRepository.save(wallet);
    }
    return wallet as Wallet;
  }
}
