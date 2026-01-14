import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddExpertToWishlistDto } from './dto/add-expert-wishlist.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { IUser } from '@/common/interfaces/user.interface';

@Controller({
    path: 'wishlist',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    @Get()
    findAll(@Req() req: { user: IUser }) {
        return this.wishlistService.findAll(req.user.id);
    }

    @Get('astrologers')
    findAllExperts(@Req() req: { user: IUser }) {
        return this.wishlistService.findAllExperts(req.user.id);
    }

    @Post('add')
    create(@Req() req: { user: IUser }, @Body() createWishlistDto: CreateWishlistDto) {
        return this.wishlistService.create(req.user.id, createWishlistDto.productId);
    }

    @Delete('remove/:productId')
    remove(@Req() req: { user: IUser }, @Param('productId') productId: string) {
        return this.wishlistService.remove(req.user.id, +productId);
    }

    @Post(['add-expert', 'astrologers/add'])
    createExpert(@Req() req: { user: IUser }, @Body() addExpertToWishlistDto: AddExpertToWishlistDto) {
        return this.wishlistService.createExpert(req.user.id, addExpertToWishlistDto.expertId);
    }

    @Delete(['remove-expert/:expertId', 'astrologers/remove/:expertId'])
    removeExpert(@Req() req: { user: IUser }, @Param('expertId') expertId: string) {
        return this.wishlistService.removeExpert(req.user.id, +expertId);
    }
}
