import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FavoritesService } from '../favorites.service';
import { ClientJwtAuthGuard } from '../../auth/guards/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClient } from '../../auth/decorators/current-client.decorator';
import { FindFavoriteProductsDto } from '../dto/favorite-product.dto';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'client/favorites/product',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class FavoriteProductController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findFavoriteProducts(
    @CurrentClient('id') clientId: number,
    @Query() query: FindFavoriteProductsDto,
  ) {
    return this.favoritesService.findFavoriteProducts(clientId, query);
  }

  @Post(':id')
  addProductToFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) productId: number,
  ) {
    return this.favoritesService.addProductToFavorites(clientId, productId);
  }

  @Delete(':id')
  removeProductFromFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.favoritesService.removeProductFromFavorites(clientId, id);
  }
}
