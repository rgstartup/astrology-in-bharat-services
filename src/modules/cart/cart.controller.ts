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
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/create-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { IUser } from '@/common/interfaces/user.interface';

@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: { user: IUser }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('/add')
  async addToCart(
    @Req() req: { user: IUser },
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartService.addToCart(req.user.id, addToCartDto);
  }

  @Put('/update')
  async updateCartItem(
    @Req() req: { user: IUser },
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(req.user.id, updateCartItemDto);
  }

  @Delete('/remove/:id')
  async removeCartItem(@Req() req: { user: IUser }, @Param('id') id: string) {
    return this.cartService.removeCartItem(req.user.id, +id);
  }
}
