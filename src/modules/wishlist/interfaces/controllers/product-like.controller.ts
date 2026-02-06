import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { IUser } from '@/common/interfaces/shared/user.interface';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { CreateWishlistDto } from '../../application/dtos/create-wishlist.dto';
import { WishlistService } from '../../application/services/wishlist.service';

@Controller({
  path: 'product-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProductLikeController {
  constructor(private readonly wishlistService: WishlistService) { }

  @Get()
  findAll(@Req() req: { user: IUser }) {
    return this.wishlistService.findAll(req.user.id);
  }

  @Post('add')
  create(
    @Req() req: { user: IUser },
    @Body() createWishlistDto: CreateWishlistDto,
  ) {
    return this.wishlistService.create(
      req.user.id,
      createWishlistDto.productId,
    );
  }

  @Delete('remove/:productId')
  remove(@Req() req: { user: IUser }, @Param('productId') productId: string) {
    return this.wishlistService.remove(req.user.id, +productId);
  }
}
