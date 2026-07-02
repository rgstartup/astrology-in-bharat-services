import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WishlistFacade } from '../../application/wishlist.facade';
import { AddMerchantWishlistDto } from '../dto/add-merchant-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'merchant-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAll(@CurrentProfile() profileId: string) {
    return this.wishlistFacade.getMerchantWishlist(profileId);
  }

  @Post('add')
  create(
    @CurrentProfile() profileId: string,
    @Body() dto: AddMerchantWishlistDto,
  ) {
    return this.wishlistFacade.addMerchantToWishlist(profileId, dto.merchantId);
  }

  @Delete('remove/:merchantId')
  async remove(
    @CurrentProfile() profileId: string,
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
  ) {
    const _result = await this.wishlistFacade.removeMerchantFromWishlist(
      profileId,
      merchantId,
    );
    return { success: true };
  }
}
