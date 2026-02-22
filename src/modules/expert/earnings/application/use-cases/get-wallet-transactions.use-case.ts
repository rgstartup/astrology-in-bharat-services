import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetWalletTransactionsUseCase {
    constructor(private readonly walletFacade: WalletFacade) { }

    async execute(userId: number, page: number, limit: number, type: string) {
        return this.walletFacade.getTransactions(userId, page, limit, type);
    }
}
