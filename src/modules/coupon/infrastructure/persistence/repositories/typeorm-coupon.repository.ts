import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICouponRepository } from '../../../domain/repositories/coupon.repository.interface';
import { Coupon } from '../../../domain/entities/coupon';

@Injectable()
export class TypeOrmCouponRepository implements ICouponRepository {
    constructor(
        @InjectRepository(Coupon)
        private readonly repository: Repository<Coupon>,
    ) { }

    async save(coupon: Coupon | Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Coupon> {
        return this.repository.save(coupon as Coupon);
    }

    async findByCode(code: string): Promise<Coupon | null> {
        return this.repository.findOne({ where: { code } });
    }

    async findById(id: number): Promise<Coupon | null> {
        return this.repository.findOne({ where: { id } });
    }

    async findAll(isActive?: boolean): Promise<Coupon[]> {
        const where = isActive !== undefined ? { isActive } : {};
        return this.repository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async remove(coupon: Coupon): Promise<void> {
        await this.repository.delete(coupon.id);
    }

    async countTotal(): Promise<number> {
        return this.repository.count();
    }

    async countActive(): Promise<number> {
        return this.repository.count({ where: { isActive: true } });
    }

    create(data: any): Coupon {
        // repository.create can return Coupon or Coupon[] depending on input
        // We explicitly cast to Coupon since we're passing a single object
        return this.repository.create(data) as unknown as Coupon;
    }
}
