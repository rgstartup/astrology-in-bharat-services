import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Injectable()
export class GetWalletBalanceUseCase {
    constructor(
        private readonly walletFacade: WalletFacade,
        private readonly userRepository: UserRepository,
    ) { }

    async execute(userId: string) {
        const localUser = await this.userRepository.findByBetterAuthId(userId);
        if (!localUser) throw new NotFoundException('User not found');

        const balance = await this.walletFacade.getBalance(localUser.id);
        const stats = await this.walletFacade.getWithdrawalsStatus(localUser.id);

        return { availableBalance: balance, ...stats };
    }
}
