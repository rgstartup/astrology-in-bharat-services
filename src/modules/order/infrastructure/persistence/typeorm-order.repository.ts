import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { IOrderRepository, IOrderItemRepository } from '../../domain/repositories/order.repository.interface';

@Injectable()
export class TypeOrmOrderRepository implements IOrderRepository {
    constructor(
        @InjectRepository(Order)
        private readonly repository: Repository<Order>,
    ) { }

    create(data: Partial<Order>): Order {
        return this.repository.create(data);
    }

    async save(order: Order): Promise<Order> {
        return this.repository.save(order);
    }

    async find(options: any): Promise<Order[]> {
        return this.repository.find(options);
    }

    async findOne(options: any): Promise<Order | null> {
        return this.repository.findOne(options);
    }

    async update(criteria: any, data: any): Promise<any> {
        return this.repository.update(criteria, data);
    }
}

@Injectable()
export class TypeOrmOrderItemRepository implements IOrderItemRepository {
    constructor(
        @InjectRepository(OrderItem)
        private readonly repository: Repository<OrderItem>,
    ) { }

    create(data: Partial<OrderItem>): OrderItem {
        return this.repository.create(data);
    }

    async save(orderItem: OrderItem): Promise<OrderItem> {
        return this.repository.save(orderItem);
    }
}
