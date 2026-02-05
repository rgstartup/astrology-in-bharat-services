import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WishlistService } from '../../application/services/wishlist.service';
import { CreateWishlistDto } from '../../application/dtos/create-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth';
import { IUser } from '@/common/interfaces/user.interface';

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
