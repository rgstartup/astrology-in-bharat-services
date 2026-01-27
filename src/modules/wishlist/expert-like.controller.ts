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
import { WishlistService } from './wishlist.service';
import { AddExpertToWishlistDto } from './dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { IUser } from '@/common/interfaces/user.interface';

@Controller({
  path: 'expert-like',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ExpertLikeController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAllExperts(@Req() req: { user: IUser }) {
    return this.wishlistService.findAllExperts(req.user.id);
  }

  @Post('add')
  createExpert(
    @Req() req: { user: IUser },
    @Body() addExpertToWishlistDto: AddExpertToWishlistDto,
  ) {
    return this.wishlistService.createExpert(
      req.user.id,
      addExpertToWishlistDto.expertId,
    );
  }

  @Delete('remove/:expertId')
  removeExpert(
    @Req() req: { user: IUser },
    @Param('expertId') expertId: string,
  ) {
    return this.wishlistService.removeExpert(req.user.id, +expertId);
  }
}
