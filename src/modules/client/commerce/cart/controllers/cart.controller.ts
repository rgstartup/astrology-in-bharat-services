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
import { CartFacade } from '../cart.facade';
import { AddToCartDto } from '../dto/create-cart.dto';
import { UpdateCartItemDto } from '../dto/update-cart.dto';
import { ClientJwtAuthGuard } from '@/modules/client/auth/guards/auth.guard';
import { CurrentClient } from '@/common/decorators/current-client.decorator';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';

@Controller({
  path: 'client/cart',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class CartController {
  constructor(private readonly cartFacade: CartFacade) {}

  @Get()
  async getCart(@CurrentClient('id') clientId: string) {
    return this.cartFacade.getCart(clientId);
  }

  @Post()
  async addToCart(
    @CurrentClient('id') clientId: string,
    @Body() addToCartDto: AddToCartDto,
  ) {
    await this.cartFacade.addToCart(clientId, addToCartDto);
    return new BooleanMessage(true, 'product added to cart');
  }

  @Put()
  async updateCartItem(
    @CurrentClient('id') clientId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    await this.cartFacade.updateCartItem(clientId, updateCartItemDto);
    return new BooleanMessage(true, 'Cart item updated');
  }

  @Delete(':id')
  async removeCartItem(
    @CurrentClient('id') clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.cartFacade.removeCartItem(clientId, id);
    return new BooleanMessage(true, 'Cart item removed');
  }
}
