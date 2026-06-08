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
import { AddPujaToWishlistDto } from '../dto/add-puja-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller({
  path: 'puja-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PujaLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAllPujas(@CurrentUser("id") userId: string) {
    return this.wishlistFacade.getPujaWishlist(userId);
  }

  @Post('add')
  createPuja(
    @CurrentUser("id") userId: string,
    @Body() addPujaToWishlistDto: AddPujaToWishlistDto,
  ) {
    return this.wishlistFacade.addPujaToWishlist(
      userId,
      addPujaToWishlistDto.pujaId,
    );
  }

  @Delete('remove/:pujaId')
  async removePuja(
    @CurrentUser("id") userId: string,
    @Param('pujaId') pujaId: string,
  ) {
    const result = await this.wishlistFacade.removePujaFromWishlist(userId, pujaId);
    return { success: true };
  }
}
