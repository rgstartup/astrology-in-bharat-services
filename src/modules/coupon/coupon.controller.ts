import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, Query, Delete } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { BulkAssignCouponDto, UserFilterDto, UserFilterListDto } from './dto/bulk-assign-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller({
    path: 'admin/coupons',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCouponController {
    constructor(private readonly couponService: CouponService) { }

    @Get()
    async getAllCoupons(@Query('isActive') isActive?: string) {
        const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
        return this.couponService.findAllAdmin(activeFilter);
    }

    @Get('stats')
    async getCouponStats() {
        return this.couponService.getAdminStats();
    }

    @Post()
    async createCoupon(@Body() createCouponDto: CreateCouponDto) {
        return this.couponService.create(createCouponDto);
    }

    @Patch(':id')
    async updateCoupon(@Param('id') id: string, @Body() updateData: any) {
        return this.couponService.update(+id, updateData);
    }

    @Post('assign/:userId')
    async assignToUser(
        @Param('userId') userId: string,
        @Body() assignCouponDto: AssignCouponDto,
    ) {
        return this.couponService.assignCouponToUser(+userId, assignCouponDto.code);
    }

    @Post('assign-bulk')
    async bulkAssignCoupon(@Body() dto: BulkAssignCouponDto) {
        return this.couponService.bulkAssignCoupon(dto);
    }

    @Delete(':id')
    async deleteCoupon(@Param('id') id: string) {
        return this.couponService.remove(+id);
    }
}

@Controller({
    path: 'admin/users',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUserFilterController {
    constructor(private readonly couponService: CouponService) { }

    @Post('filter-count')
    async getFilteredUserCount(@Body() filters: UserFilterDto) {
        const count = await this.couponService.getFilteredUserCount(filters);
        return { count };
    }

    @Post('filtered-list')
    async getFilteredUserList(@Body() filters: UserFilterListDto) {
        return this.couponService.getFilteredUserList(filters);
    }
}

@Controller({
    path: 'coupons',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class CouponController {
    constructor(private readonly couponService: CouponService) { }

    @Get('my-rewards')
    @Roles('client')
    @UseGuards(RolesGuard)
    async getMyRewards(@Req() req: any) {
        return this.couponService.getUserCoupons(req.user.id);
    }

    @Post('apply')
    @Roles('client')
    @UseGuards(RolesGuard)
    async applyCoupon(
        @Req() req: any,
        @Body('code') code: string,
        @Body('orderValue') orderValue?: number,
        @Body('serviceType') serviceType: string = 'all'
    ) {
        return this.couponService.applyCoupon(code, req.user.id, orderValue, serviceType);
    }
}
