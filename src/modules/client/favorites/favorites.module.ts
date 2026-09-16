import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorites } from './entities/favorites.entity';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { FavoriteExpertController } from './controllers/expert.controller';
import { FavoritesFacade } from './favorites.facade';
import { AddExpertToFavorites } from './use-cases/add-expert-to-fovorites.usecase';
import { FindAllFavoriteExperts } from './use-cases/find-all-favorite-experts.usecase';
import { RemoveExpertFromFavorites } from './use-cases/remove-expert-from-favorites.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Favorites, ExpertAccount])],
  controllers: [FavoriteExpertController],
  providers: [
    FavoritesFacade,
    AddExpertToFavorites,
    FindAllFavoriteExperts,
    RemoveExpertFromFavorites,
  ],
  exports: [FavoritesFacade],
})
export class FavoritesModule {}
