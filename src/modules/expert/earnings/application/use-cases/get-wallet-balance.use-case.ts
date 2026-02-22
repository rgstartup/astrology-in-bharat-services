import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetWalletBalanceUseCase {
    constructor(private readonly walletFacade: WalletFacade) { }

    async execute(userId: number) {
        const balance = await this.walletFacade.getBalance(userId);
        const stats = await this.walletFacade.getWithdrawalsStatus(userId);

        return {
            availableBalance: balance,
            ...stats
        };
    }
}
