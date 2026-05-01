import {
    Controller,
    Post,
    Body,
    UseGuards,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { Repository } from 'typeorm';
import { ConsultationBookDto } from '../dto/consultation-book.dto';

@Controller({
    path: 'consultation',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class ConsultationController {
    constructor(
        private readonly walletFacade: WalletFacade,
        private readonly chatFacade: ChatFacade,
        private readonly userRepository: UserRepository,
        @InjectRepository(ProfileExpert)
        private readonly expertRepo: Repository<ProfileExpert>,
    ) { }

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Post('book-with-wallet')
    async bookWithWallet(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: ConsultationBookDto,
    ) {
        const userId = await this.resolveUserId(user.id);
        const { expert_id, amount } = dto;

        if (!expert_id) {
            throw new BadRequestException('Expert ID is required');
        }

        const expert = await this.expertRepo.findOne({ where: { id: expert_id } });
        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        const hasBalance = await this.walletFacade.validateBalance(userId, amount);
        if (!hasBalance) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        await this.walletFacade.debit(
            userId,
            amount,
            TransactionPurpose.CONSULTATION,
            `consultation_booking_${Date.now()}`,
        );

        const session = await this.chatFacade.initiateChat(userId, expert_id);

        return {
            success: true,
            message: 'Consultation booked successfully',
            session,
        };
    }
}
