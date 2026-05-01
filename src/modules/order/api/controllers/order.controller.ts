import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    ParseIntPipe,
    NotFoundException,
} from '@nestjs/common';
import { OrderFacade } from '../../application/order.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';

@Controller({
    path: 'orders',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderController {
    constructor(
        private readonly orderFacade: OrderFacade,
        private readonly userRepository: UserRepository,
    ) {}

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Post()
    async createOrder(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateOrderDto,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.createOrder(userId, dto);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.getUserOrders(userId);
    }

    @Get()
    async getMyOrdersAlias(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.getUserOrders(userId);
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Get('admin/all')
    async getAllOrders() {
        return this.orderFacade.findAllOrders();
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderFacade.updateOrderStatus(id, dto.status, dto.cancellation_reason);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.getOrderById(id, userId);
    }
}

@Controller({
    path: 'order',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderSingularController {
    constructor(
        private readonly orderFacade: OrderFacade,
        private readonly userRepository: UserRepository,
    ) {}

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Post()
    async createOrder(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateOrderDto,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.createOrder(userId, dto);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.getUserOrders(userId);
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderFacade.updateOrderStatus(id, dto.status, dto.cancellation_reason);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.orderFacade.getOrderById(id, userId);
    }
}
