import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistFacade } from '../../application/wishlist.facade';
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'product-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProductLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAll(@CurrentProfile() profileId: string) {
    return this.wishlistFacade.getProductWishlist(profileId);
  }

  @Post('add')
  create(
    @CurrentProfile() profileId: string,
    @Body() createWishlistDto: CreateWishlistDto,
  ) {
    return this.wishlistFacade.addProductToWishlist(
      profileId,
      createWishlistDto.productId,
    );
  }

  @Delete('remove/:productId')
  async remove(
    @CurrentProfile() profileId: string,
    @Param('productId') productId: string,
  ) {
    const _result = await this.wishlistFacade.removeProductFromWishlist(
      profileId,
      productId,
    );
    return { success: true };
  }
}
