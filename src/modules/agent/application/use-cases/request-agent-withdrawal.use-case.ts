import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { RequestAgentWithdrawalDto } from '../../api/dto/request-agent-withdrawal.dto';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class RequestAgentWithdrawalUseCase {
  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(
    user: IUser,
    dto: RequestAgentWithdrawalDto,
    idempotencyKey: string,
    ipUa: { ip: string; ua: string },
  ) {
    const { amount, bank_account_id } = dto;
    const where = user.profile
      ? { id: user.profile, user_id: user.id }
      : { user_id: user.id };
    const profile = await this.profileAgentRepo.findOne({ where });
    if (!profile) {
      throw new BadRequestException('Agent profile not found');
    }

    return this.walletFacade.requestWithdrawal(
      profile.id,
      'agent_id',
      amount,
      bank_account_id,
      idempotencyKey,
      ipUa,
    );
  }
}
