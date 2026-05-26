import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WishlistFacade } from '../../application/wishlist.facade';
import { AddExpertToWishlistDto } from '../dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller({
  path: 'expert-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAllExperts(@CurrentUser("id") userId: string) {
    return this.wishlistFacade.getExpertWishlist(userId);
  }

  @Post('add')
  createExpert(
    @CurrentUser("id") userId: string,
    @Body() addExpertToWishlistDto: AddExpertToWishlistDto,
  ) {
    return this.wishlistFacade.addExpertToWishlist(
      userId,
      addExpertToWishlistDto.expertId,
    );
  }

  @Delete('remove/:expertId')
  removeExpert(
    @CurrentUser("id") userId: string,
    @Param('expertId') expertId: string,
  ) {
    return this.wishlistFacade.removeExpertFromWishlist(userId, expertId);
  }
}
