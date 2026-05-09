import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { CartFacade } from '@/modules/cart/application/cart.facade';
import { Cart } from '@/modules/cart/infrastructure/entities/cart.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Product } from '@/modules/product/infrastructure/entities/product.entity';
import { CreateOrderDto } from '../../api/dto/create-order.dto';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/entities/transaction.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { CouponFacade } from '@/modules/coupon/application/coupon.facade';

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
    private couponFacade: CouponFacade,
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
      this.logger.log(`[CREATE_ORDER] Request received. User: ${userId}, DTO: ${JSON.stringify(dto)}`);

      let totalAmount = 0;
      let itemsToCreate: { product_id: number; quantity: number; price: number; merchant_id: number | null }[] = [];

      if (dto.product_id) {
        // 1. Handle Single Product Order (Buy Now)
        const product = await queryRunner.manager.findOne(Product, { where: { id: dto.product_id } });
        
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const quantity = Number(dto.quantity) || 1;
        this.logger.log(`[CREATE_ORDER] Single product order: ${product.name} (ID: ${product.id}), Qty: ${quantity}`);
        
        if (product.stock < quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
        }

        const price = Number(product.price) || 0;
        totalAmount = price * quantity;
        this.logger.log(`[CREATE_ORDER] Base price: ₹${product.price}, MRP: ₹${product.original_price}, Authoritative price used: ₹${price}`);
        
        itemsToCreate.push({
          product_id: product.id,
          quantity: quantity,
          price: price,
          merchant_id: product.merchant_id,
        });

        // Deduct stock safely & atomically
        await queryRunner.manager.decrement(Product, { id: product.id }, 'stock', quantity);
        this.logger.log(`[CREATE_ORDER] Decremented stock by ${quantity} for product ${product.id}`);
      } else {
        // 2. Handle Cart-based Order
        const cart = (await this.cartFacade.getCart(userId)) as Cart;
        if (!cart || !cart.items || cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        for (const item of cart.items) {
          const product = item.product;
          const qty = Number(item.quantity) || 1;
          
          if (product.stock < qty) {
            throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
          }

          const price = Number(product.price) || 0;
          totalAmount += price * qty;
          this.logger.log(`[CREATE_ORDER] Cart Item: ${product.name}, Price used: ₹${price}, Qty: ${qty}`);
          
          itemsToCreate.push({
            product_id: product.id,
            quantity: qty,
            price: price,
            merchant_id: product.merchant_id,
          });

          // Deduct stock safely & atomically
          await queryRunner.manager.decrement(Product, { id: product.id }, 'stock', qty);
          this.logger.log(`[CREATE_ORDER] Decremented stock by ${qty} for product ${product.id}`);
        }
      }

      this.logger.log(`[CREATE_ORDER] Initial totalAmount before coupon: ₹${totalAmount}`);

      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new BadRequestException(`Invalid order total amount: ${totalAmount}`);
      }

      // 2.3 Apply Coupon if provided
      let discountAmount = 0;
      if (dto.coupon_code) {
        try {
          const couponResult = await this.couponFacade.applyCoupon(userId, dto.coupon_code, totalAmount);
          if (couponResult && couponResult.success) {
            discountAmount = couponResult.discount;
            totalAmount = couponResult.final_amount;
            this.logger.log(`[CREATE_ORDER] Coupon applied successfully: ${dto.coupon_code}. Discount: ₹${discountAmount}, New totalAmount: ₹${totalAmount}`);
          } else {
            this.logger.warn(`[CREATE_ORDER] Coupon application failed (success=false) for: ${dto.coupon_code}`);
          }
        } catch (e) {
          this.logger.error(`[CREATE_ORDER] Error applying coupon ${dto.coupon_code}: ${e.message}`);
          throw new BadRequestException(e.message || 'Invalid coupon code');
        }
      } else {
        this.logger.log(`[CREATE_ORDER] No coupon_code provided in DTO`);
      }

      // --- FAIL-SAFE: Re-verify totalAmount is a valid number ---
      totalAmount = Number(totalAmount);
      if (isNaN(totalAmount) || totalAmount < 0) {
        throw new BadRequestException(`Final calculation resulted in invalid amount: ${totalAmount}`);
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

        // Force Number conversion to be safe against any decimal-to-string conversion
        const finalDebitAmount = Number(totalAmount);
        this.logger.log(`[CREATE_ORDER] [WALLET_DEBIT] Final calculated debit amount: ₹${finalDebitAmount} (Type: ${typeof finalDebitAmount})`);

        // Debit user wallet
        await this.walletFacade.debit(
          userId,
          finalDebitAmount,
          TransactionPurpose.PRODUCT_PURCHASE,
          `order_wallet_payment`,
          queryRunner,
        );
        this.logger.log(`[CREATE_ORDER] [WALLET_DEBIT] Successfully debited ₹${finalDebitAmount} from user ${userId}`);

        // Mark coupon as used if applied
        if (dto.coupon_code) {
          this.logger.log(`[CREATE_ORDER] [COUPON] Marking coupon ${dto.coupon_code} as used for user ${userId}`);
          await this.couponFacade.markCouponAsUsed(userId, dto.coupon_code, queryRunner.manager);
        }
      }

      // 2.7 Generate Delivery OTP (6 digits)
      const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Create Order record
      const order = queryRunner.manager.create(Order, {
        user_id: userId,
        total_amount: totalAmount,
        shipping_address: shipping_address,
        status: isWalletPayment ? OrderStatus.PAID : OrderStatus.PENDING,
        payment_method: dto.payment_method || 'razorpay',
        delivery_otp: deliveryOtp,
        coupon_code: dto.coupon_code,
        discount_amount: discountAmount,
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
      const errorMessage = error instanceof BadRequestException ? `Order Validation Failed: ${error.message}` : `Internal Order Error: ${error.message}`;
      this.logger.error(`[CREATE_ORDER] ${errorMessage} for user ${userId}`);
      // Propagate the specific message to the frontend for debugging
      throw new BadRequestException(error.message || 'Failed to process order');
    } finally {
      await queryRunner.release();
    }
  }
}
