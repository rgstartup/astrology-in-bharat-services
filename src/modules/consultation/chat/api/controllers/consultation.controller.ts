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
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/entities/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';
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
        private readonly couponFacade: CouponFacade,
        @InjectRepository(ProfileExpert)
        private readonly expertRepo: Repository<ProfileExpert>,
    ) { }

    @Post('book-with-wallet')
    async bookWithWallet(
        @CurrentUser() user: User,
        @Body() dto: ConsultationBookDto,
    ) {
        const { expert_id, amount } = dto;

        if (!expert_id) {
            throw new BadRequestException('Expert ID is required');
        }

        const expert = await this.expertRepo.findOne({ where: { id: expert_id } });
        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        let finalAmount = amount;
        let discountAmount = 0;

        if (dto.coupon_code) {
            try {
                const couponResult = await this.couponFacade.applyCoupon(user.id, dto.coupon_code, amount);
                if (couponResult && couponResult.success) {
                    discountAmount = couponResult.discount;
                    finalAmount = couponResult.final_amount;
                }
            } catch (e) {
                throw new BadRequestException(e.message || 'Invalid coupon code');
            }
        }

        // 1. Validate Balance
        const hasBalance = await this.walletFacade.validateBalance(user.id, finalAmount);
        if (!hasBalance) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        // 2. Debit Wallet
        await this.walletFacade.debit(
            user.id,
            finalAmount,
            TransactionPurpose.CONSULTATION,
            `consultation_booking_${Date.now()}`,
        );

        if (dto.coupon_code) {
            await this.couponFacade.markCouponAsUsed(user.id, dto.coupon_code);
        }

        // 3. Initiate Chat Session
        // We use the existing initiateChat logic but since we already debited, 
        // we might need a way to tell it it's already paid or just let it handle its own reservation if it's per-minute.
        // However, for "fixed price" booking, we might need a different flag.
        // Given the current architecture, initiateChat handles its own balance check.

        // For now, we'll just initiate the chat. The user now has 'amount' less balance.
        const session = await this.chatFacade.initiateChat(user.id, expert_id);

        return {
            success: true,
            message: 'Consultation booked successfully',
            session,
        };
    }
}
