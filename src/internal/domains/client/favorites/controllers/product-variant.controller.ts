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
import { FavoritesService } from '../favorites.service';
import { ClientJwtAuthGuard } from '@/internal/domains/client/auth/guards/auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClient } from '@/internal/domains/client/auth/decorators/current-client.decorator';
import { FindFavoriteProductVariantsDto } from '../dto/favorite-product-variant.dto';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'client/favorites/product-variant',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class FavoriteProductVariantController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findFavoriteProductVariants(
    @CurrentClient('id') clientId: number,
    @Query() query: FindFavoriteProductVariantsDto,
  ) {
    return this.favoritesService.findFavoriteProductVariants(clientId, query);
  }

  @Post(':id')
  addProductVariantToFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) variantId: number,
  ) {
    return this.favoritesService.addProductVariantToFavorites(
      clientId,
      variantId,
    );
  }

  @Delete(':id')
  removeProductVariantFromFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.favoritesService.removeProductVariantFromFavorites(clientId, id);
  }
}
