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
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller({
  path: 'merchant-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class MerchantLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.wishlistFacade.getMerchantWishlist(userId);
  }

  @Post('add')
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: AddMerchantWishlistDto,
  ) {
    return this.wishlistFacade.addMerchantToWishlist(
      userId,
      dto.merchantId,
    );
  }

  @Delete('remove/:merchantId')
  remove(
    @CurrentUser('id') userId: string,
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
  ) {
    return this.wishlistFacade.removeMerchantFromWishlist(userId, merchantId);
  }
}
