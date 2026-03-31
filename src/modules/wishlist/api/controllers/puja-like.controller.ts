import { Controller, Post, Param, UseGuards, ParseIntPipe, Get } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { TogglePujaWishlistUseCase } from '../../application/use-cases/toggle-puja-wishlist.use-case';
import { GetPujaWishlistUseCase } from '../../application/use-cases/get-puja-wishlist.use-case';

@Controller('wishlist/puja')
export class PujaLikeController {
  constructor(
    private readonly togglePujaWishlistUseCase: TogglePujaWishlistUseCase,
    private readonly getPujaWishlistUseCase: GetPujaWishlistUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getWishlist(@CurrentUser() user: User) {
    return this.getPujaWishlistUseCase.execute(user.id);
  }

  @Post(':id/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.togglePujaWishlistUseCase.execute(user.id, id);
  }
}
