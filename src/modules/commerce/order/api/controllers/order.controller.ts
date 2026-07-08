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
    @CurrentProfile() profileId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderFacade.createOrder(profileId, userId, dto);
  }

  @Get('my-orders')
  async getMyOrders(
    @CurrentProfile() profileId: string,
    @CurrentUser('id') userId: string,
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
    @CurrentProfile() profileId: string,
    @CurrentUser('id') userId: string,
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
    @Param('id', ParseUUIDPipe) id: string,
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

  @Get(':id')
  async getOrder(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
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
    @CurrentProfile() profileId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderFacade.createOrder(profileId, userId, dto);
  }

  @Get('my-orders')
  async getMyOrders(
    @CurrentProfile() profileId: string,
    @CurrentUser('id') userId: string,
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
    @Param('id', ParseUUIDPipe) id: string,
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

  @Get(':id')
  async getOrder(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderFacade.getOrderById(id, profileId);
  }
}
