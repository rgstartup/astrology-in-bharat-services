import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Injectable()
export class GetWalletTransactionsUseCase {
    constructor(
        private readonly walletFacade: WalletFacade,
        private readonly userRepository: UserRepository,
    ) { }

    async execute(userId: string, page: number, limit: number, type: string) {
        const localUser = await this.userRepository.findByBetterAuthId(userId);
        if (!localUser) throw new NotFoundException('User not found');

        return this.walletFacade.getTransactions(localUser.id, page, limit, type);
    }
}
