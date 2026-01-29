import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '@/modules/cart/cart.service';
import { Cart } from '@/modules/cart/entities/cart.entity';

@Injectable()
export class OrderService {
    constructor(
        @InjectRepository(Order)
        private orderRepo: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepo: Repository<OrderItem>,
        private cartService: CartService,
        private dataSource: DataSource,
    ) { }

    async createOrderFromCart(userId: number, shippingAddress: any) {
        const cart = (await this.cartService.getCart(userId)) as Cart;

        if (!cart || !cart.items || cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Calculate Total Amount
            let totalAmount = 0;
            cart.items.forEach((item) => {
                totalAmount += Number(item.product.price) * item.quantity;
            });

            // 2. Create Order
            const order = this.orderRepo.create({
                userId,
                totalAmount,
                shippingAddress,
                status: OrderStatus.PENDING,
            });

            const savedOrder = await queryRunner.manager.save(order);

            // 3. Create Order Items
            const orderItems = cart.items.map((cartItem) => {
                return this.orderItemRepo.create({
                    order: savedOrder,
                    productId: cartItem.product.id,
                    quantity: cartItem.quantity,
                    price: cartItem.product.price,
                });
            });

            await queryRunner.manager.save(orderItems);

            await queryRunner.commitTransaction();
            return savedOrder;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async markAsPaid(razorpayOrderId: string) {
        const order = await this.orderRepo.findOne({
            where: { razorpayOrderId },
        });

        if (!order) {
            // This might be okay if it's a wallet recharge order, handled elsewhere.
            return;
        }

        order.status = OrderStatus.PAID;
        await this.orderRepo.save(order);
    }

    async setRazorpayOrderId(orderId: number, razorpayOrderId: string) {
        await this.orderRepo.update(orderId, { razorpayOrderId });
    }

    async getUserOrders(userId: number) {
        return this.orderRepo.find({
            where: { userId },
            relations: ['items', 'items.product'],
            order: { createdAt: 'DESC' },
        });
    }

    async getOrderById(id: number, userId: number) {
        const order = await this.orderRepo.findOne({
            where: { id, userId },
            relations: ['items', 'items.product'],
        });

        if (!order) throw new NotFoundException('Order not found');
        return order;
    }
}
