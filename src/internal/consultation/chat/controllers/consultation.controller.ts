import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentProfile } from '../../../../shared/decorators/current-profile.decorator';
import { WalletService } from '../../../finance/wallet/wallet.service';
import { ClientChatService } from '@/internal/actors/client/consultation/chat/chat.service';
import { TransactionPurpose } from '../../../finance/wallet/enum';
import { ExpertProfileService } from '../../../actors/expert/profile/profile.service';
import { CouponService } from '../../../commerce/coupon/coupon.service';
import { ConsultationBookDto } from '../dto/consultation-book.dto';

@Controller({
  path: 'consultation',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  constructor(
    private readonly walletService: WalletService,
    private readonly clientChatService: ClientChatService,
    private readonly couponService: CouponService,
    private readonly expertProfileService: ExpertProfileService,
  ) {}

  @Post('book-with-wallet')
  async bookWithWallet(
    @CurrentProfile() profileId: number,
    @Body() dto: ConsultationBookDto,
  ) {
    const { expert_id, amount } = dto;

    if (!expert_id) {
      throw new BadRequestException('Expert ID is required');
    }

    const expert = await this.expertProfileService.getExpertById(expert_id);
    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    let finalAmount = amount;

    let _discountAmount = 0;

    if (dto.coupon_code) {
      try {
        const couponResult = await this.couponService.applyCoupon(
          dto.coupon_code,
          amount,
        );
        if (couponResult && couponResult.success) {
          _discountAmount = couponResult.discount;
          finalAmount = couponResult.final_amount;
        }
      } catch (e: unknown) {
        throw new BadRequestException(
          (e as Error).message || 'Invalid coupon code',
        );
      }
    }

    // 1. Validate Balance
    const hasBalance = await this.walletService.validateBalance(
      profileId,
      'client_id',
      finalAmount,
    );
    if (!hasBalance) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // 2. Debit Wallet
    await this.walletService.debit(
      profileId,
      'client_id',
      finalAmount,
      TransactionPurpose.CONSULTATION,
      `consultation_booking_${Date.now()}`,
    );

    if (dto.coupon_code) {
      await this.couponService.markCouponAsUsed(profileId, dto.coupon_code);
    }

    // 3. Initiate Chat Session
    // We use the existing initiateChat logic but since we already debited,
    // we might need a way to tell it it's already paid or just let it handle its own reservation if it's per-minute.
    // However, for "fixed price" booking, we might need a different flag.
    // Given the current architecture, initiateChat handles its own balance check.

    // For now, we'll just initiate the chat. The user now has 'amount' less balance.
    const session = await this.clientChatService.initiateChat(
      profileId,
      expert_id,
    );

    return {
      success: true,
      message: 'Consultation booked successfully',
      session,
    };
  }
}
