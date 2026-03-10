import { Injectable } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class RequestWithdrawalUseCase {
    constructor(private readonly walletFacade: WalletFacade) { }

    async execute(userId: number, amount: number, bank_account_id: number) {
        return this.walletFacade.requestWithdrawal(userId, amount, bank_account_id);
    }
}
