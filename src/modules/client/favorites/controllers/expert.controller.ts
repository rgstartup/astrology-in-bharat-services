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
import { FindFavoritesDto } from '../dto/findFavorites.dto';
import { AddExpertFavoriteDto } from '../dto/favorite.dto';
import { FavoriteItemType } from '../enum/favorite-type.enum';

@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'client/favorites/expert',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class FavoriteExpertController {
  constructor(private readonly favoritesFacade: FavoritesFacade) {}

  @Get()
  async findAll(
    @CurrentClient('id') clientId: number,
    @Query() query: FindFavoritesDto,
  ) {
    return this.favoritesFacade.findAll(clientId, query);
  }

  @Post('add')
  create(
    @CurrentClient('id') clientId: number,
    @Body() dto: AddExpertFavoriteDto,
  ) {
    return this.favoritesFacade.add({
      clientId,
      item_id: dto.expert_id,
      item_type: FavoriteItemType.EXPERT,
    });
  }

  @Delete(':id')
  remove(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.favoritesFacade.remove({
      clientId,
      item_id: id,
    });
  }
}
