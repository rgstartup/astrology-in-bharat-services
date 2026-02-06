import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';

export interface IOrderRepository {
    create(data: Partial<Order>): Order;
    save(order: Order): Promise<Order>;
    find(options: any): Promise<Order[]>;
    findOne(options: any): Promise<Order | null>;
    update(criteria: any, data: any): Promise<any>;
}

export const IOrderRepository = Symbol('IOrderRepository');

export interface IOrderItemRepository {
    create(data: Partial<OrderItem>): OrderItem;
    save(orderItem: OrderItem): Promise<OrderItem>;
}

export const IOrderItemRepository = Symbol('IOrderItemRepository');
