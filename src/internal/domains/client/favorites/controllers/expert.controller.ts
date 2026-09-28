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
import { FindFavoriteExpertsDto } from '../dto/favorite-expert.dto';
@ApiTags('Favorites')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'client/favorites/expert',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class FavoriteExpertController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findFavoriteExperts(
    @CurrentClient('id') clientId: number,
    @Query() query: FindFavoriteExpertsDto,
  ) {
    return this.favoritesService.findFavoriteExperts(clientId, query);
  }

  @Post(':id')
  addExpertToFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) expertId: number,
  ) {
    return this.favoritesService.addExpertToFavorites(clientId, expertId);
  }

  @Delete(':id')
  removeExpertFromFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.favoritesService.removeExpertFromFavorites(clientId, id);
  }
}
