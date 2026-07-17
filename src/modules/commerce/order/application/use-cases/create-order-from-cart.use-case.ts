import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/entities/order.entity';
import { OrderItem } from '../../infrastructure/entities/order-item.entity';
import { CartFacade } from '@/modules/commerce/cart/application/cart.facade';
import { Cart } from '@/modules/commerce/cart/infrastructure/entities/cart.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { CreateOrderDto } from '../../api/dto/create-order.dto';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

@Injectable()
export class CreateOrderFromCartUseCase {
  private readonly logger = new Logger(CreateOrderFromCartUseCase.name);

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @Inject(forwardRef(() => CartFacade))
    private cartFacade: CartFacade,
    @Inject(forwardRef(() => WalletFacade))
    private walletFacade: WalletFacade,
    @Inject(forwardRef(() => CouponFacade))
    private couponFacade: CouponFacade,
    private dataSource: DataSource,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
  ) {}

  async execute(profileId: string, userId: string, dto: CreateOrderDto) {
    const shipping_address = dto.shipping_address as
      | Record<string, unknown>
      | undefined;

    if (!shipping_address) {
      throw new BadRequestException('Shipping address is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(
        `[CREATE_ORDER] Request received. ProfileId: ${profileId}, UserId: ${userId}, DTO: ${JSON.stringify(dto)}`,
      );

      let totalAmount = 0;
      const itemsToCreate: {
        product_id: string;
        quantity: number;
        price: number;
        merchant_id: string | null;
        shipping_charge: number;
      }[] = [];

      if (dto.product_id) {
        // 1. Handle Single Product Order (Buy Now)
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: dto.product_id },
        });

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        const quantity = Number(dto.quantity) || 1;
        this.logger.log(
          `[CREATE_ORDER] Single product order: ${product.name} (ID: ${product.id}), Qty: ${quantity}`,
        );

        if (product.stock < quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          );
        }

        const price = Number(product.price) || 0;
        totalAmount = price * quantity;
        this.logger.log(
          `[CREATE_ORDER] Base price: ₹${product.price}, MRP: ₹${product.original_price}, Authoritative price used: ₹${price}`,
        );

        itemsToCreate.push({
          product_id: product.id,
          quantity: quantity,
          price: price,
          merchant_id: product.merchant_id,
          shipping_charge: product.is_shipping_chargeable ? Number(product.shipping_charge) || 0 : 0,
        });

        // Deduct stock safely & atomically
        await queryRunner.manager.decrement(
          Product,
          { id: product.id },
          'stock',
          quantity,
        );
        this.logger.log(
          `[CREATE_ORDER] Decremented stock by ${quantity} for product ${product.id}`,
        );
      } else {
        // 2. Handle Cart-based Order
        const cart = (await this.cartFacade.getCart(profileId)) as Cart;
        if (!cart || !cart.items || cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        for (const item of cart.items) {
          const product = item.product;
          const qty = Number(item.quantity) || 1;

          if (product.stock < qty) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Available: ${product.stock}`,
            );
          }

          const price = Number(product.price) || 0;
          totalAmount += price * qty;
          this.logger.log(
            `[CREATE_ORDER] Cart Item: ${product.name}, Price used: ₹${price}, Qty: ${qty}`,
          );

          itemsToCreate.push({
            product_id: product.id,
            quantity: qty,
            price: price,
            merchant_id: product.merchant_id,
            shipping_charge: product.is_shipping_chargeable ? Number(product.shipping_charge) || 0 : 0,
          });

          // Deduct stock safely & atomically
          await queryRunner.manager.decrement(
            Product,
            { id: product.id },
            'stock',
            qty,
          );
          this.logger.log(
            `[CREATE_ORDER] Decremented stock by ${qty} for product ${product.id}`,
          );
        }
      }

      this.logger.log(
        `[CREATE_ORDER] Initial totalAmount before coupon: ₹${totalAmount}`,
      );

      if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new BadRequestException(
          `Invalid order total amount: ${totalAmount}`,
        );
      }

      // 2.3 Apply Coupon if provided
      let discountAmount = 0;
      if (dto.coupon_code) {
        try {
          const couponResult = await this.couponFacade.applyCoupon(
            dto.coupon_code,
            totalAmount,
          );
          if (couponResult && couponResult.success) {
            discountAmount = couponResult.discount;
            totalAmount = couponResult.final_amount;
            this.logger.log(
              `[CREATE_ORDER] Coupon applied successfully: ${dto.coupon_code}. Discount: ₹${discountAmount}, New totalAmount: ₹${totalAmount}`,
            );
          } else {
            this.logger.warn(
              `[CREATE_ORDER] Coupon application failed (success=false) for: ${dto.coupon_code}`,
            );
          }
        } catch (error: unknown) {
          this.logger.error(
            `[CREATE_ORDER] Error applying coupon ${dto.coupon_code}: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw new BadRequestException(
            (error instanceof Error ? error.message : String(error)) ||
              'Invalid coupon code',
          );
        }
      } else {
        this.logger.log(`[CREATE_ORDER] No coupon_code provided in DTO`);
      }

      // Calculate Total Shipping
      let totalShipping = 0;
      const merchantShippingMap = new Map<string, number>();

      for (const item of itemsToCreate) {
        const merchantKey = item.merchant_id || 'platform';
        const currentMaxShipping = merchantShippingMap.get(merchantKey) || 0;
        if (item.shipping_charge > currentMaxShipping) {
          merchantShippingMap.set(merchantKey, item.shipping_charge);
        }
      }

      for (const shipping of merchantShippingMap.values()) {
        totalShipping += shipping;
      }

      this.logger.log(`[CREATE_ORDER] Total shipping calculated: ₹${totalShipping}`);
      totalAmount += totalShipping;

      // Add Platform Fee
      const platformFee = await this.walletFacade.getAdminCommissionFromSetting('PLATFORM_FEE');
      totalAmount += platformFee;
      this.logger.log(`[CREATE_ORDER] Added platform fee ₹${platformFee}. Final totalAmount: ₹${totalAmount}`);

      // --- FAIL-SAFE: Re-verify totalAmount is a valid number ---
      totalAmount = Number(totalAmount);
      if (isNaN(totalAmount) || totalAmount < 0) {
        throw new BadRequestException(
          `Final calculation resulted in invalid amount: ${totalAmount}`,
        );
      }

      // 2.5 Handle Payment Method
      const method = dto.payment_method?.toLowerCase();
      const isWalletPayment = method === 'wallet';
      const isSplitPayment = method === 'split';
      const walletAmountToUse = Number(dto.wallet_amount_to_use || 0);

      if (isWalletPayment) {
        // Full Wallet Payment
        const hasBalance = await this.walletFacade.validateBalance(
          profileId,
          'client_id',
          totalAmount,
        );
        if (!hasBalance) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        const finalDebitAmount = Number(totalAmount);
        this.logger.log(
          `[CREATE_ORDER] [WALLET_DEBIT] Full wallet payment: ₹${finalDebitAmount}`,
        );

        await this.walletFacade.debit(
          profileId,
          'client_id',
          finalDebitAmount,
          TransactionPurpose.PRODUCT_PURCHASE,
          `order_wallet_payment`,
          queryRunner,
        );
        this.logger.log(
          `[CREATE_ORDER] [WALLET_DEBIT] Successfully debited ₹${finalDebitAmount} from user ${userId}`,
        );

        if (dto.coupon_code) {
          await this.couponFacade.markCouponAsUsed(
            profileId,
            dto.coupon_code,
            queryRunner.manager,
          );
        }
      } else if (isSplitPayment && walletAmountToUse > 0) {
        // Split Payment: Deduct wallet portion now, Razorpay will handle the rest
        if (walletAmountToUse > totalAmount) {
          throw new BadRequestException(
            'Wallet amount to use cannot exceed total order amount',
          );
        }

        const hasBalance = await this.walletFacade.validateBalance(
          profileId,
          'client_id',
          walletAmountToUse,
        );
        if (!hasBalance) {
          throw new BadRequestException(
            `Insufficient wallet balance. You need ₹${walletAmountToUse} in wallet for split payment`,
          );
        }

        this.logger.log(
          `[CREATE_ORDER] [SPLIT_PAYMENT] Deducting ₹${walletAmountToUse} from wallet. Remaining ₹${totalAmount - walletAmountToUse} via Razorpay`,
        );

        await this.walletFacade.debit(
          profileId,
          'client_id',
          walletAmountToUse,
          TransactionPurpose.PRODUCT_PURCHASE,
          `order_split_wallet_payment`,
          queryRunner,
        );
        this.logger.log(
          `[CREATE_ORDER] [SPLIT_PAYMENT] Successfully debited wallet portion ₹${walletAmountToUse}`,
        );

        if (dto.coupon_code) {
          await this.couponFacade.markCouponAsUsed(
            profileId,
            dto.coupon_code,
            queryRunner.manager,
          );
        }
      }

      // 2.7 Generate Delivery OTP (6 digits)
      const deliveryOtp = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      // 3. Create Order record using profileId directly as client_id
      const isSplitPaymentActive = method === 'split' && walletAmountToUse > 0;
      const razorpayAmountDue = isSplitPaymentActive
        ? totalAmount - walletAmountToUse
        : totalAmount;

      const order = queryRunner.manager.create(Order, {
        client_id: profileId,
        total_amount: totalAmount,
        shipping_address: shipping_address,
        // Wallet=PAID, Split=PENDING (waiting for Razorpay), others=PENDING
        status: isWalletPayment ? OrderStatus.PAID : OrderStatus.PENDING,
        payment_method: dto.payment_method || 'razorpay',
        delivery_otp: deliveryOtp,
        coupon_code: dto.coupon_code,
        discount_amount: Math.round(Number(discountAmount)),
        shipping_charge: Math.round(Number(totalShipping)),
        platform_fee: Math.round(Number(platformFee)),
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // 4. Create Order Items
      const initialStatus = isWalletPayment ? OrderStatus.PAID : OrderStatus.PENDING;
      for (const item of itemsToCreate) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          status: initialStatus,
        });
        await queryRunner.manager.save(OrderItem, orderItem);
      }

      // 5. Clear Cart
      if (!dto.product_id) {
        await this.cartFacade.clearCart(profileId);
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `[CREATE_ORDER] Transaction committed for order ${savedOrder.id}`,
      );

      // Notifications follow commit
      try {
        this.notificationGateway.emitToAdmins('new_order', {
          order_id: savedOrder.id,
          client_id: profileId,
          total_amount: totalAmount,
          created_at: savedOrder.created_at,
        });
      } catch (_error: unknown) {
        /* ignore socket errors */
      }

      return {
        ...savedOrder,
        razorpay_amount_due: razorpayAmountDue,
        wallet_amount_used: isSplitPaymentActive ? walletAmountToUse : 0,
      };
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      const errorMessage =
        error instanceof BadRequestException
          ? `Order Validation Failed: ${error instanceof Error ? error.message : String(error)}`
          : `Internal Order Error: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(
        `[CREATE_ORDER] ${errorMessage} for profileId ${profileId}`,
      );
      // Propagate the specific message to the frontend for debugging
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : String(error) || 'Failed to process order',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
