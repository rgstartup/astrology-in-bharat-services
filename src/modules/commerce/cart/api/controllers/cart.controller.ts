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
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartFacade: CartFacade) {}

  @Get()
  async getCart(@CurrentProfile() profileId: string) {
    return this.cartFacade.getCart(profileId);
  }

  @Post('/add')
  async addToCart(
    @CurrentProfile() profileId: string,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartFacade.addToCart(profileId, addToCartDto);
  }

  @Put('/update')
  async updateCartItem(
    @CurrentProfile() profileId: string,
    @Body() updateCartItemDto: UpdateCartItemDto & { productId: string },
  ) {
    const _result = await this.cartFacade.updateCartItem(
      profileId,
      updateCartItemDto,
    );
    return { success: true };
  }

  @Delete('/remove/:id')
  async removeCartItem(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const _result = await this.cartFacade.removeCartItem(profileId, id);
    return { success: true };
  }
}
