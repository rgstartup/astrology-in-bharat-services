import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { GetAgentProfileUseCase } from './get-agent-profile.use-case';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { RequestAgentWithdrawalDto } from '../../api/dto/request-agent-withdrawal.dto';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class RequestAgentWithdrawalUseCase {
  constructor(
    private readonly getAgentProfileUseCase: GetAgentProfileUseCase,
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
    const profile = await this.getAgentProfileUseCase.execute(user);
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
