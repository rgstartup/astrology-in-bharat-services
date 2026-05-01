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
import { AddPujaToWishlistDto } from '../dto/add-puja-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
  path: 'puja-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PujaLikeController {
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
  async findAllPujas(@CurrentUser() user: AuthenticatedUser) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.getPujaWishlist(userId);
  }

  @Post('add')
  async createPuja(
    @CurrentUser() user: AuthenticatedUser,
    @Body() addPujaToWishlistDto: AddPujaToWishlistDto,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.addPujaToWishlist(userId, addPujaToWishlistDto.pujaId);
  }

  @Delete('remove/:pujaId')
  async removePuja(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pujaId') pujaId: string,
  ) {
    const userId = await this.resolveUserId(user.id);
    return this.wishlistFacade.removePujaFromWishlist(userId, +pujaId);
  }
}
