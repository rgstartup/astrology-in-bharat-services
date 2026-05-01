import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { WishlistFacade } from '../../application/wishlist.facade';
import { AddExpertToWishlistDto } from '../dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
  path: 'expert-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertLikeController {
  constructor(
    private readonly wishlistFacade: WishlistFacade,
    private readonly userRepository: UserRepository,
  ) {}

  private async resolveUserId(betterAuthId: string): Promise<number> {
    const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
    if (!localUser) throw new NotFoundException('User not found');
    return localUser.id;
  }

  @Get()
  async findAllExperts(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.getExpertWishlist(userId);
  }

  @Post('add')
  async createExpert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() addExpertToWishlistDto: AddExpertToWishlistDto,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.addExpertToWishlist(userId, addExpertToWishlistDto.expertId);
  }

  @Delete('remove/:expertId')
  async removeExpert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('expertId') expertId: string,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.removeExpertFromWishlist(userId, +expertId);
  }
}
