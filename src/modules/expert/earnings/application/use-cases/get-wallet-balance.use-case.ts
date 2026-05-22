import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetWalletBalanceUseCase {
    constructor(private readonly walletFacade: WalletFacade) { }

    async execute(userId: string) {
        const balance = await this.walletFacade.getBalance(userId as any);
        const stats = await this.walletFacade.getWithdrawalsStatus(userId);
        const totalEarnings = await this.walletFacade.getTotalEarnings(userId);

        return {
            availableBalance: balance,
            totalEarnings: totalEarnings,
            ...stats
        };
    }
}
