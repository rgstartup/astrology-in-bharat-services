import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WishlistFacade } from '../wishlist.facade';
import { AddMerchantWishlistDto } from '../dto/add-merchant-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'merchant-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAll(@CurrentProfile() profileId: number) {
    return this.wishlistFacade.getMerchantWishlist(profileId);
  }

  @Post('add')
  create(
    @CurrentProfile() profileId: number,
    @Body() dto: AddMerchantWishlistDto,
  ) {
    return this.wishlistFacade.addMerchantToWishlist(profileId, dto.merchantId);
  }

  @Delete('remove/:merchantId')
  async remove(
    @CurrentProfile() profileId: number,
    @Param('merchantId', ParseIntPipe) merchantId: number,
  ) {
    const _result = await this.wishlistFacade.removeMerchantFromWishlist(
      profileId,
      merchantId,
    );
    return { success: true };
  }
}
