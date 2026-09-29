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
import { WishlistService } from '../wishlist.service';
import { AddExpertToWishlistDto } from '../dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentProfile } from '../../../../shared/decorators/current-profile.decorator';

@Controller({
  path: 'expert-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertLikeController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAllExperts(@CurrentProfile() profileId: number) {
    return this.wishlistService.getExpertWishlist(profileId);
  }

  @Post('add')
  createExpert(
    @CurrentProfile() profileId: number,
    @Body() addExpertToWishlistDto: AddExpertToWishlistDto,
  ) {
    return this.wishlistService.addExpertToWishlist(
      profileId,
      addExpertToWishlistDto.expert_id,
    );
  }

  @Delete('remove/:expert_id')
  async removeExpert(
    @CurrentProfile() profileId: number,
    @Param('expert_id', ParseIntPipe) expert_id: number,
  ) {
    const _result = await this.wishlistService.removeExpertFromWishlist(
      profileId,
      expert_id,
    );
    return { success: true };
  }
}
