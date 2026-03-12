import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { OrderItem } from '../../infrastructure/persistence/entities/order-item.entity';
import { CartFacade } from '@/modules/cart/application/cart.facade';
import { Cart } from '@/modules/cart/infrastructure/persistence/entities/cart.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { CreateOrderDto } from '../../api/dto/create-order.dto';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class CreateOrderFromCartUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private cartFacade: CartFacade,
    private walletFacade: WalletFacade,
    private dataSource: DataSource,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
  ) { }

  async execute(userId: number, dto: CreateOrderDto) {
    const shipping_address = dto.shipping_address;

    if (!shipping_address) {
      throw new BadRequestException('Shipping address is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      let itemsToCreate: { product_id: number; quantity: number; price: number }[] = [];

      if (dto.product_id) {
        // 1. Handle Single Product Order (Buy Now)
        const product = await this.productRepo.findOne({ where: { id: dto.product_id } });
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const quantity = dto.quantity || 1;
        totalAmount = Number(product.price) * quantity;
        itemsToCreate.push({
          product_id: product.id,
          quantity: quantity,
          price: Number(product.price),
        });
      } else {
        // 2. Handle Cart-based Order
        const cart = (await this.cartFacade.getCart(userId)) as Cart;
        if (!cart || !cart.items || cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        cart.items.forEach((item) => {
          totalAmount += Number(item.product.price) * item.quantity;
          itemsToCreate.push({
            product_id: item.product.id,
            quantity: item.quantity,
            price: Number(item.product.price),
          });
        });
      }

      // 2.5 Handle Wallet Payment
      if (dto.payment_method === 'wallet') {
        const hasBalance = await this.walletFacade.validateBalance(userId, totalAmount);
        if (!hasBalance) {
          throw new BadRequestException('Insufficient wallet balance');
        }
        // Debit wallet
        await this.walletFacade.debit(
          userId,
          totalAmount,
          TransactionPurpose.PRODUCT_PURCHASE,
          `order_pending_${Date.now()}`,
          queryRunner,
        );
      }

      // 3. Create Order
      const order = this.orderRepo.create({
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: shipping_address,
        status: dto.payment_method === 'wallet' ? OrderStatus.PAID : OrderStatus.PENDING,
        payment_method: dto.payment_method || 'razorpay',
      });

      const savedOrder = (await queryRunner.manager.save(order)) as Order;

      // 4. Create Order Items
      const orderItems = itemsToCreate.map((item) => {
        return this.orderItemRepo.create({
          order_id: savedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        });
      });

      await queryRunner.manager.save(orderItems);

      // --- NEW: Tracking Logic for Wallet Payments ---
      if (dto.payment_method === 'wallet') {
        for (const item of itemsToCreate) {
          const product = await queryRunner.manager.findOne(Product, { where: { id: item.product_id } });
          if (product && product.expert_id) {
            const itemTotal = Number(item.price) * (item.quantity || 1);
            try {
              await queryRunner.manager.createQueryBuilder()
                .update(ProfileExpert)
                .set({ total_earning: () => `COALESCE(total_earning, 0) + ${Number(itemTotal)}` })
                .where('id = :id', { id: product.expert_id })
                .execute();
              console.log(`[CREATE_ORDER_TRACKING] Updated earnings for expert profile ${product.expert_id} with amount ${itemTotal}`);
            } catch (e) {
              console.error('[CREATE_ORDER_TRACKING] Expert earning error:', e);
            }
          }
        }
      }
      // ----------------------------------------------

      // 5. Clear Cart if it was a cart-based order
      if (!dto.product_id) {
        await this.cartFacade.clearCart(userId);
      }

      await queryRunner.commitTransaction();

      // Emit socket event to all admins about new order
      try {
        this.notificationGateway.emitToAdmins('new_order', {
          order_id: savedOrder.id,
          user_id: userId,
          total_amount: totalAmount,
          created_at: savedOrder.created_at,
        });
      } catch (notifError) {
        console.error('Failed to emit admin notification:', notifError);
      }

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
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
