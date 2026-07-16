import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { UpdateWithdrawalStatusDto } from '../../api/dto/update-withdrawal-status.dto';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
  constructor(
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(id: string, adminId: string, dto: UpdateWithdrawalStatusDto) {
    const { status, remark } = dto;
    return this.walletFacade.updateWithdrawalStatus(
      id,
      status,
      adminId,
      remark,
    );
  }
}
