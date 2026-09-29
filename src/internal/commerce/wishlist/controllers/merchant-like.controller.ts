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
import { WishlistService } from '../wishlist.service';
import { AddMerchantWishlistDto } from '../dto/add-merchant-wishlist.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentProfile } from '../../../../shared/decorators/current-profile.decorator';

@Controller({
  path: 'merchant-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantLikeController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAll(@CurrentProfile() profileId: number) {
    return this.wishlistService.getMerchantWishlist(profileId);
  }

  @Post('add')
  create(
    @CurrentProfile() profileId: number,
    @Body() dto: AddMerchantWishlistDto,
  ) {
    return this.wishlistService.addMerchantToWishlist(
      profileId,
      dto.merchantId,
    );
  }

  @Delete('remove/:merchantId')
  async remove(
    @CurrentProfile() profileId: number,
    @Param('merchantId', ParseIntPipe) merchantId: number,
  ) {
    const _result = await this.wishlistService.removeMerchantFromWishlist(
      profileId,
      merchantId,
    );
    return { success: true };
  }
}
