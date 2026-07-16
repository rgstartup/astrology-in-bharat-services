import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { GetWithdrawalsDto } from '../../api/dto/get-withdrawals.dto';

@Injectable()
export class GetAdminWithdrawalsUseCase {
  constructor(
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(dto: GetWithdrawalsDto) {
    const { page, limit, status, role } = dto;
    const offset = (page - 1) * limit;
    return this.walletFacade.getPendingWithdrawals(limit, offset, status, role);
  }
}
