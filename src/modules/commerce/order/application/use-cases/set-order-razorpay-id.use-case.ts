import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../infrastructure/entities/order.entity';

@Injectable()
export class SetOrderRazorpayIdUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async execute(orderId: string, razorpayOrderId: string) {
    await this.orderRepo.update(orderId, {
      razorpay_order_id: razorpayOrderId,
    });
  }
}
