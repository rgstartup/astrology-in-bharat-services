import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class CheckChatEligibilityUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private expertProfileFacade: ExpertProfileFacade,
    @Inject(forwardRef(() => WalletFacade))
    private walletFacade: WalletFacade,
  ) {}

  async execute(clientId: string, expertId: string) {
    // Get expert details
    const expert = await this.expertProfileFacade.getExpertById(expertId);
    const chatPrice = expert ? Number(expert.chat_price) || Number(expert.price) || 0 : 0;
    const minMins = 5;
    const minBalanceRequired = chatPrice * minMins;

    // Check free eligibility
    const chatCount = await this.sessionRepo.count({
      where: {
        client_id: clientId,
        status: ChatSessionStatus.COMPLETED,
      },
    });

    const isFreeEnabled = process.env.FREE_CHAT_ENABLED === 'true';
    const isEligibleForFree = isFreeEnabled && chatCount === 0;
    const freeMinutes = isEligibleForFree
      ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
      : 0;

    // Check wallet balance
    const hasBalance = isEligibleForFree
      ? true
      : await this.walletFacade.validateBalance(
          clientId,
          'client_id',
          minBalanceRequired,
        );

    const wallet = await this.walletFacade.getWallet(clientId, 'client_id');
    const currentBalance = wallet ? Number(wallet.balance) : 0;

    return {
      isEligibleForFree,
      freeMinutes,
      hasBalance,
      minBalanceRequired,
      currentBalance,
      chatPrice,
      expertIsAvailable: expert ? Boolean(expert.is_available) : false,
    };
  }
}
