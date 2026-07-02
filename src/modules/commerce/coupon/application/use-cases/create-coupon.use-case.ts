import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../../infrastructure/entities/coupon.entity';

@Injectable()
export class CreateCouponUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async execute(data: Record<string, unknown>) {
    const existing = await this.couponRepository.findOne({
      where: { code: data.code as string },
    });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const coupon = this.couponRepository.create({
      ...data,
      expiry_date: data.expiry_date
        ? new Date(data.expiry_date as string | number)
        : null,
    });

    return this.couponRepository.save(coupon);
  }
}
