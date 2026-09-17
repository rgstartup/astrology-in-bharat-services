import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FavoritesFacade } from '../favorites.facade';
import { ClientJwtAuthGuard } from '@/modules/client/auth/guards/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClient } from '@/common/decorators/current-client.decorator';
import { FindFavoriteProductsDto } from '../dto/favorite-product.dto';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'client/favorites/product',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class FavoriteProductController {
  constructor(private readonly favoritesFacade: FavoritesFacade) {}

  @Get()
  async findFavoriteProducts(
    @CurrentClient('id') clientId: number,
    @Query() query: FindFavoriteProductsDto,
  ) {
    return this.favoritesFacade.findFavoriteProducts(clientId, query);
  }

  @Post()
  addProductToFavorites(
    @CurrentClient('id') clientId: number,
    @Body('id', ParseIntPipe) productId: number,
  ) {
    return this.favoritesFacade.addProductToFavorites(clientId, productId);
  }

  @Delete(':id')
  removeProductFromFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.favoritesFacade.removeProductFromFavorites(clientId, id);
  }
}
