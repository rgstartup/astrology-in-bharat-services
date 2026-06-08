
import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { OrderFacade } from '../../application/order.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';

// Standard Controller (Plural 'orders') - Restores /api/v1/orders
@Controller({
    path: 'orders',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderController {
    constructor(private readonly orderFacade: OrderFacade) { }

    @Post()
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.orderFacade.createOrder(user.id, dto);
    }

    @Get('my-orders')
    async getMyOrders(
        @CurrentUser() user: User,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        const { data, total_count } = await this.orderFacade.getUserOrders(user.id, limitNum, offsetNum);
        return {
            success: true,
            data,
            meta: {
                total_count,
                limit: limitNum,
                offset: offsetNum,
            },
        };
    }

    @Get()
    async getMyOrdersAlias(
        @CurrentUser() user: User,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.getMyOrders(user, limit, offset);
    }

    @Roles('ADMIN')
    @UseGuards(RolesGuard)
    @Get('admin/all')
    async getAllOrders() {
        return this.orderFacade.findAllOrders();
    }

    @Roles('ADMIN')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        const result = await this.orderFacade.updateOrderStatus(id, dto.status, dto.cancellation_reason);
        return { success: true };
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.orderFacade.getOrderById(id, user.id);
    }
}

// Compatibility Controller (Singular 'order') - For /api/v1/order/my-orders
@Controller({
    path: 'order',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderSingularController {
    constructor(private readonly orderFacade: OrderFacade) { }

    @Post()
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.orderFacade.createOrder(user.id, dto);
    }

    @Get('my-orders')
    async getMyOrders(
        @CurrentUser() user: User,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        const { data, total_count } = await this.orderFacade.getUserOrders(user.id, limitNum, offsetNum);
        return {
            success: true,
            data,
            meta: {
                total_count,
                limit: limitNum,
                offset: offsetNum,
            },
        };
    }

    // Admin endpoint also available on singular path for consistency if needed
    @Roles('ADMIN')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        const result = await this.orderFacade.updateOrderStatus(id, dto.status, dto.cancellation_reason);
        return { success: true };
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.orderFacade.getOrderById(id, user.id);
    }
}
