import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderFacade } from '../order.facade';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { GetMyOrdersDto } from '../dto/get-my-orders.dto';
import { IUser } from '@/common/types/access-token.payload';

// Standard Controller (Plural 'orders') - Restores /api/v1/orders
@Controller({
  path: 'orders',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderFacade: OrderFacade) {}

  @Post()
  async createOrder(
    @CurrentProfile() profileId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderFacade.createOrder(profileId, userId, dto);
  }

  @Get('my-orders')
  async getMyOrders(
    @CurrentProfile() profileId: number,
    @CurrentUser('id') userId: number,
    @Query() dto: GetMyOrdersDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 10;
    const offsetNum = dto.offset ? dto.offset : 0;
    const { data, total_count } = await this.orderFacade.getUserOrders(
      profileId,
      userId,
      dto,
    );
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
    @CurrentProfile() profileId: number,
    @CurrentUser('id') userId: number,
    @Query() dto: GetMyOrdersDto,
  ) {
    return this.getMyOrders(profileId, userId, dto);
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
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: IUser,
  ) {
    const _result = await this.orderFacade.updateOrderStatus(
      id,
      dto.status,
      dto.cancellation_reason,
      undefined,
      user,
    );
    return { success: true };
  }
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('cancellation_reason') cancellationReason: string,
    @CurrentProfile() profileId: number,
    @CurrentUser() user: IUser,
  ) {
    await this.orderFacade.cancelUserOrder(
      id,
      profileId,
      cancellationReason || 'Cancelled by user',
      user,
    );
    return { success: true };
  }

  @Get(':id')
  async getOrder(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderFacade.getOrderById(id, profileId);
  }
}

// Compatibility Controller (Singular 'order') - For /api/v1/order/my-orders
@Controller({
  path: 'order',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderSingularController {
  constructor(private readonly orderFacade: OrderFacade) {}

  @Post()
  async createOrder(
    @CurrentProfile() profileId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderFacade.createOrder(profileId, userId, dto);
  }

  @Get('my-orders')
  async getMyOrders(
    @CurrentProfile() profileId: number,
    @CurrentUser('id') userId: number,
    @Query() dto: GetMyOrdersDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 10;
    const offsetNum = dto.offset ? dto.offset : 0;
    const { data, total_count } = await this.orderFacade.getUserOrders(
      profileId,
      userId,
      dto,
    );
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
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: IUser,
  ) {
    const _result = await this.orderFacade.updateOrderStatus(
      id,
      dto.status,
      dto.cancellation_reason,
      undefined,
      user,
    );
    return { success: true };
  }
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('cancellation_reason') cancellationReason: string,
    @CurrentProfile() profileId: number,
    @CurrentUser() user: IUser,
  ) {
    await this.orderFacade.cancelUserOrder(
      id,
      profileId,
      cancellationReason || 'Cancelled by user',
      user,
    );
    return { success: true };
  }

  @Get(':id')
  async getOrder(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderFacade.getOrderById(id, profileId);
  }
}
