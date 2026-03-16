import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(CreateOrderFromCartUseCase.name);

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
      this.logger.log(`[CREATE_ORDER] User: ${userId}, PaymentMethod: ${dto.payment_method}`);

      let totalAmount = 0;
      let itemsToCreate: { product_id: number; quantity: number; price: number; expert_id: number | null }[] = [];

      if (dto.product_id) {
        // 1. Handle Single Product Order (Buy Now)
        const product = await queryRunner.manager.findOne(Product, { where: { id: dto.product_id } });
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const quantity = dto.quantity || 1;
        const price = Number(product.price) || 0;
        totalAmount = price * quantity;
        
        itemsToCreate.push({
          product_id: product.id,
          quantity: quantity,
          price: price,
          expert_id: product.expert_id
        });
      } else {
        // 2. Handle Cart-based Order
        const cart = (await this.cartFacade.getCart(userId)) as Cart;
        if (!cart || !cart.items || cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        cart.items.forEach((item) => {
          const price = Number(item.product.price) || 0;
          const qty = item.quantity || 1;
          totalAmount += price * qty;
          
          itemsToCreate.push({
            product_id: item.product.id,
            quantity: qty,
            price: price,
            expert_id: item.product.expert_id
          });
        });
      }

      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new BadRequestException(`Invalid order total amount: ${totalAmount}`);
      }

      // 2.5 Handle Wallet Payment
      const method = dto.payment_method?.toLowerCase();
      const isWalletPayment = method === 'wallet';
      
      if (isWalletPayment) {
        // Validation before debit
        const hasBalance = await this.walletFacade.validateBalance(userId, totalAmount);
        if (!hasBalance) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        // Debit user wallet
        await this.walletFacade.debit(
          userId,
          totalAmount,
          TransactionPurpose.PRODUCT_PURCHASE,
          `order_wallet_payment`,
          queryRunner,
        );
        this.logger.log(`[CREATE_ORDER] Debited ₹${totalAmount} from user ${userId}`);
      }

      // 3. Create Order record
      const order = queryRunner.manager.create(Order, {
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: shipping_address,
        status: isWalletPayment ? OrderStatus.PAID : OrderStatus.PENDING,
        payment_method: dto.payment_method || 'razorpay',
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // 4. Create Order Items & Credit Experts if Wallet Payment
      for (const item of itemsToCreate) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        });
        await queryRunner.manager.save(OrderItem, orderItem);

        // If paid by wallet, credit the expert now
        if (isWalletPayment && item.expert_id) {
          const itemTotal = Number(item.price) * (item.quantity || 1);
          
          // IMPORTANT: Product.expert_id in this system matches User.id
          // Wallet operations use user_id.
          await this.walletFacade.credit(
            item.expert_id, // Expert's user_id
            itemTotal,
            TransactionPurpose.PRODUCT_PURCHASE,
            `order_${savedOrder.id}_item_credit`,
            queryRunner
          );
          this.logger.log(`[CREATE_ORDER] Credited ₹${itemTotal} to expert ${item.expert_id}`);
        }
      }

      // 5. Clear Cart
      if (!dto.product_id) {
        await this.cartFacade.clearCart(userId);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`[CREATE_ORDER] Transaction committed for order ${savedOrder.id}`);

      // Notifications follow commit
      try {
        this.notificationGateway.emitToAdmins('new_order', {
          order_id: savedOrder.id,
          user_id: userId,
          total_amount: totalAmount,
          created_at: savedOrder.created_at,
        });
      } catch (e) { /* ignore socket errors */ }

      return savedOrder;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`[CREATE_ORDER] Failed for user ${userId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
