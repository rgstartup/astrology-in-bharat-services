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
import { AddPujaToWishlistDto } from '../dto/add-puja-wishlist.dto';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { CurrentProfile } from '@/shared/decorators/current-profile.decorator';

@Controller({
  path: 'puja-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PujaLikeController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAllPujas(@CurrentProfile() profileId: number) {
    return this.wishlistService.getPujaWishlist(profileId);
  }

  @Post('add')
  createPuja(
    @CurrentProfile() profileId: number,
    @Body() addPujaToWishlistDto: AddPujaToWishlistDto,
  ) {
    return this.wishlistService.addPujaToWishlist(
      profileId,
      addPujaToWishlistDto.pujaId,
    );
  }

  @Delete('remove/:pujaId')
  async removePuja(
    @CurrentProfile() profileId: number,
    @Param('pujaId', ParseIntPipe) pujaId: number,
  ) {
    const _result = await this.wishlistService.removePujaFromWishlist(
      profileId,
      pujaId,
    );
    return { success: true };
  }
}
