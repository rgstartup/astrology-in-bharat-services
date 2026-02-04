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
import { NotificationService } from '@/modules/notification/notification.service';
import { NotificationGateway } from '@/modules/notification/notification.gateway';
import { NotificationType } from '@/modules/notification/entities/notification.entity';
import { EmailService } from '@/common/services/email.service';
import { User } from '@/modules/users/entities/user.entity';
import { CouponService } from '@/modules/coupon/coupon.service';

@Injectable()
export class OrderService {
    constructor(
        @InjectRepository(Order)
        private orderRepo: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepo: Repository<OrderItem>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private cartService: CartService,
        private dataSource: DataSource,
        private notificationService: NotificationService,
        private notificationGateway: NotificationGateway,
        private emailService: EmailService,
        private couponService: CouponService,
    ) { }

    async createOrderFromCart(userId: number, shippingAddress: any, couponCode?: string) {
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

            let discountAmount = 0;
            if (couponCode) {
                const coupon = await this.couponService.applyCoupon(couponCode, userId, totalAmount, 'product');
                if (coupon.type === 'percentage') {
                    discountAmount = (totalAmount * Number(coupon.value)) / 100;
                } else {
                    discountAmount = Number(coupon.value);
                }
            }

            const finalAmount = Math.max(0, totalAmount - discountAmount);

            // 2. Create Order
            const order = this.orderRepo.create({
                userId,
                totalAmount: finalAmount,
                discountAmount,
                couponCode,
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

            // Emit socket event to all admins about new order
            this.notificationGateway.emitToAdmins('new_order', {
                orderId: savedOrder.id,
                userId,
                totalAmount: finalAmount,
                createdAt: savedOrder.createdAt,
            });

            // Send order confirmation email to user
            try {
                const user = await this.userRepo.findOne({ where: { id: userId } });
                if (user?.email) {
                    const emailHtml = `
                        <h2>Order Confirmation</h2>
                        <p>Dear ${user.name || 'Customer'},</p>
                        <p>Your order has been placed successfully!</p>
                        <p><strong>Order ID:</strong> #${savedOrder.id}</p>
                        <p><strong>Total Amount:</strong> ₹${finalAmount}</p>
                        ${discountAmount > 0 ? `<p><strong>Discount Applied:</strong> ₹${discountAmount}</p>` : ''}
                        <p><strong>Status:</strong> ${savedOrder.status}</p>
                        <p>We will notify you once your order is shipped.</p>
                        <p>Thank you for shopping with us!</p>
                    `;
                    await this.emailService.sendEmail(
                        user.email,
                        'Order Confirmation - Your order has been placed',
                        emailHtml,
                    );
                }
            } catch (emailError) {
                console.error('Failed to send order confirmation email:', emailError);
            }

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
            return;
        }

        order.status = OrderStatus.PAID;
        await this.orderRepo.save(order);

        // Automate coupon used status
        if (order.couponCode && order.userId) {
            await this.couponService.markCouponAsUsed(order.couponCode, order.userId);
        }
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

    async updateOrderStatus(id: number, status: OrderStatus, cancellationReason?: string) {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');

        order.status = status;
        if (cancellationReason) {
            order.cancellationReason = cancellationReason;
        }

        const updatedOrder = await this.orderRepo.save(order);

        // Create notification and emit socket event based on status
        let notificationType: NotificationType;
        let title: string;
        let message: string;

        switch (status) {
            case OrderStatus.PACKED:
                notificationType = NotificationType.ORDER_PACKED;
                title = 'Order Packed';
                message = `Your order #${id} has been packed and is ready for shipment`;
                break;
            case OrderStatus.SHIPPED:
                notificationType = NotificationType.ORDER_SHIPPED;
                title = 'Order Shipped';
                message = `Your order #${id} has been shipped`;
                break;
            case OrderStatus.DELIVERED:
                notificationType = NotificationType.ORDER_DELIVERED;
                title = 'Order Delivered';
                message = `Your order #${id} has been delivered`;
                break;
            case OrderStatus.CANCELLED:
                notificationType = NotificationType.ORDER_CANCELLED;
                title = 'Order Cancelled';
                message = cancellationReason
                    ? `Your order #${id} has been cancelled. Reason: ${cancellationReason}`
                    : `Your order #${id} has been cancelled`;
                break;
            default:
                return updatedOrder; // No notification for other statuses
        }

        // Save notification to DB
        await this.notificationService.create(
            order.userId,
            notificationType,
            title,
            message,
            { orderId: id, status, amount: order.totalAmount },
        );

        // Emit real-time socket event to user
        this.notificationGateway.emitToUser(order.userId, 'order_status_updated', {
            orderId: id,
            status,
            title,
            message,
            cancellationReason,
        });

        // Send status update email to user
        try {
            const user = await this.userRepo.findOne({ where: { id: order.userId } });
            if (user?.email) {
                const emailHtml = `
                    <h2>${title}</h2>
                    <p>Dear ${user.name || 'Customer'},</p>
                    <p>${message}</p>
                    <p><strong>Order ID:</strong> #${id}</p>
                    <p><strong>New Status:</strong> ${status}</p>
                    ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
                    <p>Thank you for your patience!</p>
                `;
                await this.emailService.sendEmail(
                    user.email,
                    `Order Update - ${title}`,
                    emailHtml,
                );
            }
        } catch (emailError) {
            console.error('Failed to send status update email:', emailError);
        }

        return updatedOrder;
    }

    async findAllOrders() {
        return this.orderRepo.find({
            relations: ['items', 'items.product', 'user'],
            order: { createdAt: 'DESC' },
        });
    }
}
