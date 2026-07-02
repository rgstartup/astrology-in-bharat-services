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
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'puja-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PujaLikeController {
  constructor(private readonly wishlistFacade: WishlistFacade) {}

  @Get()
  findAllPujas(@CurrentProfile() profileId: string) {
    return this.wishlistFacade.getPujaWishlist(profileId);
  }

  @Post('add')
  createPuja(
    @CurrentProfile() profileId: string,
    @Body() addPujaToWishlistDto: AddPujaToWishlistDto,
  ) {
    return this.wishlistFacade.addPujaToWishlist(
      profileId,
      addPujaToWishlistDto.pujaId,
    );
  }

  @Delete('remove/:pujaId')
  async removePuja(
    @CurrentProfile() profileId: string,
    @Param('pujaId') pujaId: string,
  ) {
    const _result = await this.wishlistFacade.removePujaFromWishlist(
      profileId,
      pujaId,
    );
    return { success: true };
  }
}
