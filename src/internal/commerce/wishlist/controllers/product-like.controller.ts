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
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentProfile } from '../../../../shared/decorators/current-profile.decorator';

@Controller({
  path: 'product-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProductLikeController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAll(@CurrentProfile() profileId: number) {
    return this.wishlistService.getProductWishlist(profileId);
  }

  @Post('add')
  create(
    @CurrentProfile() profileId: number,
    @Body() createWishlistDto: CreateWishlistDto,
  ) {
    return this.wishlistService.addProductToWishlist(
      profileId,
      createWishlistDto.productId,
    );
  }

  @Delete('remove/:productId')
  async remove(
    @CurrentProfile() profileId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const _result = await this.wishlistService.removeProductFromWishlist(
      profileId,
      productId,
    );
    return { success: true };
  }
}
