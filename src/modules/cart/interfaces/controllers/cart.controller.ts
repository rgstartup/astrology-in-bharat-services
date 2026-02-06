import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { AddToCartDto } from '../../application/dtos/create-cart.dto';
import { UpdateCartItemDto } from '../../application/dtos/update-cart.dto';
import { CartService } from '../../application/services/cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user.id);
  }

  @Post('add')
  async addToCart(
    @CurrentUser() user: User,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartService.addToCart(user.id, addToCartDto);
  }

  @Put('update')
  async updateCartItem(
    @CurrentUser() user: User,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.id, updateCartItemDto);
  }

  @Delete('remove/:productId')
  async removeCartItem(
    @CurrentUser() user: User,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeCartItem(user.id, productId);
  }
}

