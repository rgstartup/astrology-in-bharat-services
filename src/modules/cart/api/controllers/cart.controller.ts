import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartFacade } from '../../application/cart.facade';
import { AddToCartDto } from '../dto/create-cart.dto';
import { UpdateCartItemDto } from '../dto/update-cart.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartFacade: CartFacade) {}

  @Get()
  async getCart(@CurrentUser() user: User) {
    return this.cartFacade.getCart(user.id);
  }

  @Post('/add')
  async addToCart(
    @CurrentUser() user: User,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartFacade.addToCart(user.id, addToCartDto);
  }

  @Put('/update')
  async updateCartItem(
    @CurrentUser() user: User,
    @Body() updateCartItemDto: UpdateCartItemDto & { productId: number },
  ) {
    return this.cartFacade.updateCartItem(user.id, updateCartItemDto);
  }

  @Delete('/remove/:id')
  async removeCartItem(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cartFacade.removeCartItem(user.id, +id);
  }
}
