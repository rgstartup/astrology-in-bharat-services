import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { WishlistFacade } from '../../application/wishlist.facade';
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
  path: 'product-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProductLikeController {
  constructor(
    private readonly wishlistFacade: WishlistFacade,
    private readonly userRepository: UserRepository,
  ) {}

  private async resolveUserId(betterAuthId: string): Promise<number> {
    const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
    if (!localUser) throw new NotFoundException('User not found');
    return localUser.id;
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.getProductWishlist(userId);
  }

  @Post('add')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createWishlistDto: CreateWishlistDto,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.addProductToWishlist(userId, createWishlistDto.productId);
  }

  @Delete('remove/:productId')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.removeProductFromWishlist(userId, +productId);
  }
}
