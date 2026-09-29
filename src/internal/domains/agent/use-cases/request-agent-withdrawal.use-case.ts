import type { DeferredDependency } from '../../../../shared/types/deferred-dependency.type';
import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '../entities/profile-agent.entity';
import { WalletService } from '../../../finance/wallet/wallet.service';
import { RequestAgentWithdrawalDto } from '../dto/request-agent-withdrawal.dto';
import { IUser } from '../../../../shared/types/access-token.payload';

@Injectable()
export class RequestAgentWithdrawalUseCase {
  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: DeferredDependency<WalletService>,
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

    return this.walletService.requestWithdrawal(
      profile.id,
      'agent_id',
      amount,
      bank_account_id,
      idempotencyKey,
      ipUa,
    );
  }
}
