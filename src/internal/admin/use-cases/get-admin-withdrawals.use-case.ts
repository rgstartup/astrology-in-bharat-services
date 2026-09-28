import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { WalletService } from '@/internal/finance/wallet/wallet.service';
import { GetWithdrawalsDto } from '../dto/get-withdrawals.dto';

@Injectable()
export class GetAdminWithdrawalsUseCase {
  constructor(
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {}

  async execute(dto: GetWithdrawalsDto) {
    const { page, limit, status, role } = dto;
    const offset = (page - 1) * limit;
    return this.walletService.getPendingWithdrawals(limit, offset, status, role);
  }
}
