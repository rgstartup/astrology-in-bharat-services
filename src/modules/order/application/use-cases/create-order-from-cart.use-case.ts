import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { OrderItem } from '../../infrastructure/persistence/entities/order-item.entity';
import { CartFacade } from '@/modules/cart/application/cart.facade';
import { Cart } from '@/modules/cart/infrastructure/persistence/entities/cart.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Injectable()
export class CreateOrderFromCartUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private cartFacade: CartFacade,
    private dataSource: DataSource,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
  ) { }

  async execute(userId: number, shippingAddress: any) {
    const cart = (await this.cartFacade.getCart(userId)) as Cart;

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
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        status: OrderStatus.PENDING,
      });

      const savedOrder = (await queryRunner.manager.save(order)) as Order;

      // 3. Create Order Items
      const orderItems = cart.items.map((cartItem) => {
        return this.orderItemRepo.create({
          order_id: savedOrder.id,
          product_id: cartItem.product.id,
          quantity: cartItem.quantity,
          price: cartItem.product.price,
        });
      });

      await queryRunner.manager.save(orderItems);

      await queryRunner.commitTransaction();

      // Emit socket event to all admins about new order
      this.notificationGateway.emitToAdmins('new_order', {
        order_id: savedOrder.id,
        user_id: userId,
        total_amount: totalAmount,
        created_at: savedOrder.created_at,
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
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
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
}
