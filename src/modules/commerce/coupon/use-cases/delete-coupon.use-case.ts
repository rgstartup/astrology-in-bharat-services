import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';

@Injectable()
export class DeleteCouponUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async execute(id: number | string) {
    const coupon = await this.couponRepository.findOne({ where: { id: Number(id) } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.couponRepository.remove(coupon);
    return new BooleanMessage();
  }
}
