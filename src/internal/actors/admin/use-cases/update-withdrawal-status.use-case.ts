import type { DeferredDependency } from '../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletService } from '../../finance/wallet/wallet.service';
import { UpdateWithdrawalStatusDto } from '../dto/update-withdrawal-status.dto';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
  constructor(
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: DeferredDependency<WalletService>,
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
