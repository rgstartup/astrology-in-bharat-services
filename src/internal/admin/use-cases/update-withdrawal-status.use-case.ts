import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletService } from '@/internal/finance/wallet/wallet.service';
import { UpdateWithdrawalStatusDto } from '../dto/update-withdrawal-status.dto';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
  constructor(
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {}

  async execute(id: number, adminId: number, dto: UpdateWithdrawalStatusDto) {
    const { status, remark } = dto;
    return this.walletService.updateWithdrawalStatus(
      id,
      status,
      adminId,
      remark,
    );
  }
}
