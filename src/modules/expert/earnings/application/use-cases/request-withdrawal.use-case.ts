import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Injectable()
export class RequestWithdrawalUseCase {
    constructor(
        private readonly walletFacade: WalletFacade,
        private readonly userRepository: UserRepository,
    ) { }

    async execute(userId: string, amount: number, bank_account_id: number) {
        const localUser = await this.userRepository.findByBetterAuthId(userId);
        if (!localUser) throw new NotFoundException('User not found');

        return this.walletFacade.requestWithdrawal(localUser.id, amount, bank_account_id);
    }
}
