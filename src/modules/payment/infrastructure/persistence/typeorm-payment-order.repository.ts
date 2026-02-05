import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrder } from '../../domain/entities/payment-order.entity';
import { IPaymentOrderRepository } from '../../domain/repositories/payment-order.repository.interface';

@Injectable()
export class TypeOrmPaymentOrderRepository implements IPaymentOrderRepository {
    constructor(
        @InjectRepository(PaymentOrder)
        private readonly repository: Repository<PaymentOrder>,
    ) { }

    create(data: Partial<PaymentOrder>): PaymentOrder {
        return this.repository.create(data);
    }

    async save(paymentOrder: PaymentOrder): Promise<PaymentOrder> {
        return this.repository.save(paymentOrder);
    }

    async findOne(options: any): Promise<PaymentOrder | null> {
        return this.repository.findOne(options);
    }

    async update(criteria: any, data: any): Promise<any> {
        return this.repository.update(criteria, data);
    }
}
