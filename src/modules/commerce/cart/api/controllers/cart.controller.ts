import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartFacade } from '../../application/cart.facade';
import { AddToCartDto } from '../dto/create-cart.dto';
import { UpdateCartItemDto } from '../dto/update-cart.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';

@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartFacade: CartFacade) {}

  @Get()
  async getCart(@CurrentUser() user: IUser) {
    return this.cartFacade.getCart(user.id);
  }

  @Post('/add')
  async addToCart(
    @CurrentUser() user: IUser,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartFacade.addToCart(user.id, addToCartDto);
  }

  @Put('/update')
  async updateCartItem(
    @CurrentUser() user: IUser,
    @Body() updateCartItemDto: UpdateCartItemDto & { productId: string },
  ) {
    const _result = await this.cartFacade.updateCartItem(
      user.id,
      updateCartItemDto,
    );
    return { success: true };
  }

  @Delete('/remove/:id')
  async removeCartItem(
    @CurrentUser() user: IUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const _result = await this.cartFacade.removeCartItem(user.id, id);
    return { success: true };
  }
}
