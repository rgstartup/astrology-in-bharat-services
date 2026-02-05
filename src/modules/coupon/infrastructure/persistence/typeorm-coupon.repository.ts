import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../../domain/entities/coupon.entity';
import { ICouponRepository } from '../../domain/repositories/coupon.repository.interface';

@Injectable()
export class TypeOrmCouponRepository implements ICouponRepository {
    constructor(
        @InjectRepository(Coupon)
        private readonly repository: Repository<Coupon>,
    ) { }

    async findByCode(code: string): Promise<Coupon | null> {
        return this.repository.findOne({ where: { code } });
    }

    async findById(id: number): Promise<Coupon | null> {
        return this.repository.findOne({ where: { id } });
    }

    async save(coupon: Coupon): Promise<Coupon> {
        return this.repository.save(coupon);
    }

    create(couponData: Partial<Coupon>): Coupon {
        return this.repository.create(couponData);
    }

    async remove(coupon: Coupon): Promise<Coupon> {
        return this.repository.remove(coupon);
    }

    async findAll(isActive?: boolean): Promise<Coupon[]> {
        return this.repository.find({
            where: isActive !== undefined ? { isActive } : {},
            order: { createdAt: 'DESC' },
        });
    }

    async count(isActive?: boolean): Promise<number> {
        return this.repository.count({
            where: isActive !== undefined ? { isActive } : {},
        });
    }
}
