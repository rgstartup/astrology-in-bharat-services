import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../infrastructure/persistence/entities/order.entity';

@Injectable()
export class SetOrderRazorpayIdUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async execute(orderId: number, razorpayOrderId: string) {
    await this.orderRepo.update(orderId, { razorpayOrderId });
  }
}
