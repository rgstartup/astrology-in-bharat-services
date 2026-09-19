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
import { FindFavoriteExpertsDto } from '../dto/favorite-expert.dto';
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
  async findFavoriteExperts(
    @CurrentClient('id') clientId: number,
    @Query() query: FindFavoriteExpertsDto,
  ) {
    return this.favoritesFacade.findFavoriteExperts(clientId, query);
  }

  @Post(':id')
  addExpertToFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) expertId: number,
  ) {
    return this.favoritesFacade.addExpertToFavorites(clientId, expertId);
  }

  @Delete(':id')
  removeExpertFromFavorites(
    @CurrentClient('id') clientId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.favoritesFacade.removeExpertFromFavorites(clientId, id);
  }
}
