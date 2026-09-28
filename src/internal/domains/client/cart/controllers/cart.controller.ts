import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from '../cart.service';
import { AddToCartDto } from '../dto/create-cart.dto';
import { UpdateCartItemDto } from '../dto/update-cart.dto';
import { ClientJwtAuthGuard } from '@/internal/domains/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/domains/client/auth/decorators/current-client.decorator';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';

@Controller({
  path: 'client/cart',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentClient('id') clientId: number) {
    return this.cartService.getCart(clientId);
  }

  @Post()
  async addToCart(
    @CurrentClient('id') clientId: number,
    @Body() addToCartDto: AddToCartDto,
  ) {
    await this.cartService.addToCart(clientId, addToCartDto);
    return new BooleanMessage(true, 'product added to cart');
  }

  @Put()
  async updateCartItem(
    @CurrentClient('id') clientId: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    await this.cartService.updateCartItem(clientId, updateCartItemDto);
    return new BooleanMessage(true, 'Cart item updated');
  }

  @Delete(':id')
  async removeCartItem(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.cartService.removeCartItem(clientId, id);
    return new BooleanMessage(true, 'Cart item removed');
  }
}
