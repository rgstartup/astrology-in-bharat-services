// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class GetWalletTransactionsUseCase {
    constructor(private readonly walletFacade: WalletFacade) { }

    async execute(userId: string, limit: number, offset: number, type: string) {
        return this.walletFacade.getTransactions(userId as any, limit, offset, type);
    }
}
