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
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'product-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProductLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAll(@CurrentProfile() profileId: number) {
    return this.wishlistFacade.getProductWishlist(profileId);
  }

  @Post('add')
  create(
    @CurrentProfile() profileId: number,
    @Body() createWishlistDto: CreateWishlistDto,
  ) {
    return this.wishlistFacade.addProductToWishlist(
      profileId,
      createWishlistDto.productId,
    );
  }

  @Delete('remove/:productId')
  async remove(
    @CurrentProfile() profileId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const _result = await this.wishlistFacade.removeProductFromWishlist(
      profileId,
      productId,
    );
    return { success: true };
  }
}
