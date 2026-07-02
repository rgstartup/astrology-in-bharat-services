import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistFacade } from '../../application/wishlist.facade';
import { AddExpertToWishlistDto } from '../dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'expert-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAllExperts(@CurrentProfile() profileId: string) {
    return this.wishlistFacade.getExpertWishlist(profileId);
  }

  @Post('add')
  createExpert(
    @CurrentProfile() profileId: string,
    @Body() addExpertToWishlistDto: AddExpertToWishlistDto,
  ) {
    return this.wishlistFacade.addExpertToWishlist(
      profileId,
      addExpertToWishlistDto.expert_id,
    );
  }

  @Delete('remove/:expert_id')
  async removeExpert(
    @CurrentProfile() profileId: string,
    @Param('expert_id') expert_id: string,
  ) {
    const _result = await this.wishlistFacade.removeExpertFromWishlist(
      profileId,
      expert_id,
    );
    return { success: true };
  }
}
