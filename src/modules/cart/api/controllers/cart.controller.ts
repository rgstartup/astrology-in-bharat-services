import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { CartFacade } from '../../application/cart.facade';
import { AddToCartDto } from '../dto/create-cart.dto';
import { UpdateCartItemDto } from '../dto/update-cart.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    private readonly cartFacade: CartFacade,
    private readonly userRepository: UserRepository,
  ) {}

  private async resolveUserId(betterAuthId: string): Promise<number> {
    const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
    if (!localUser) throw new NotFoundException('User not found');
    return localUser.id;
  }

  @Get()
  async getCart(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.cartFacade.getCart(userId);
  }

  @Post('/add')
  async addToCart(
    @CurrentUser() user: AuthenticatedUser,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.cartFacade.addToCart(userId, addToCartDto);
  }

  @Put('/update')
  async updateCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateCartItemDto: UpdateCartItemDto & { productId: number },
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.cartFacade.updateCartItem(userId, updateCartItemDto);
  }

  @Delete('/remove/:id')
  async removeCartItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const userId = await this.resolveUserId(user.id);
    return this.cartFacade.removeCartItem(userId, +id);
  }
}
