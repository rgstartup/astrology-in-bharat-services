import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WishlistFacade } from '../wishlist.facade';
import { AddExpertToWishlistDto } from '../dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'expert-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAllExperts(@CurrentProfile() profileId: number) {
    return this.wishlistFacade.getExpertWishlist(profileId);
  }

  @Post('add')
  createExpert(
    @CurrentProfile() profileId: number,
    @Body() addExpertToWishlistDto: AddExpertToWishlistDto,
  ) {
    return this.wishlistFacade.addExpertToWishlist(
      profileId,
      addExpertToWishlistDto.expert_id,
    );
  }

  @Delete('remove/:expert_id')
  async removeExpert(
    @CurrentProfile() profileId: number,
    @Param('expert_id', ParseIntPipe) expert_id: number,
  ) {
    const _result = await this.wishlistFacade.removeExpertFromWishlist(
      profileId,
      expert_id,
    );
    return { success: true };
  }
}
