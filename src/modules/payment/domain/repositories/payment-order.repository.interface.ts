import { PaymentOrder } from '../entities/payment-order.entity';

export interface IPaymentOrderRepository {
    create(data: Partial<PaymentOrder>): PaymentOrder;
    save(paymentOrder: PaymentOrder): Promise<PaymentOrder>;
    findOne(options: any): Promise<PaymentOrder | null>;
    update(criteria: any, data: any): Promise<any>;
}

export const IPaymentOrderRepository = Symbol('IPaymentOrderRepository');
