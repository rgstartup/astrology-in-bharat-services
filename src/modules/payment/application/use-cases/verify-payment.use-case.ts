import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RazorpayService } from '@/external/razorpay/razorpay.service';
import { PaymentOrder, PaymentStatus } from '../../infrastructure/persistence/entities/payment-order.entity';
import { VerifyPaymentDto } from '../../api/dto/verify-payment.dto';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { OrderFacade } from '@/modules/order/application/order.facade';

@Injectable()
export class VerifyPaymentUseCase {
    private readonly logger = new Logger(VerifyPaymentUseCase.name);

    constructor(
        @InjectRepository(PaymentOrder)
        private paymentOrderRepo: Repository<PaymentOrder>,
        private razorpayService: RazorpayService,
        private walletFacade: WalletFacade,
        private orderFacade: OrderFacade,
        private dataSource: DataSource,
    ) { }

    async execute(dto: VerifyPaymentDto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

        // Signature is optional if from webhook, but for direct verification we check it
        if (razorpay_signature) {
            const isValid = this.razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid) {
                throw new BadRequestException('Invalid payment signature');
            }
        }

        const order = await this.paymentOrderRepo.findOne({
            where: { razorpay_order_id: razorpay_order_id },
        });

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        if (order.status === PaymentStatus.SUCCESS) {
            return { success: true, message: 'Payment already verified' };
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            order.status = PaymentStatus.SUCCESS;
            order.razorpay_payment_id = razorpay_payment_id;
            order.razorpay_signature = razorpay_signature || '';
            await queryRunner.manager.save(order);

            const isProduct = order.notes?.type === 'product' || order.notes?.isOrder === true;

            if (!isProduct) {
                // Case 1: Wallet Recharge
                await this.walletFacade.topUp(order.user_id, order.amount, `razorpay_${razorpay_payment_id}`);
                await queryRunner.commitTransaction();
                return { success: true, message: 'Payment successful and wallet updated' };
            } else {
                // Case 2: Product Purchase
                await this.orderFacade.markAsPaid(order.razorpay_order_id);
                this.logger.log(`Product payment verified for order ${order.razorpay_order_id}`);
                await queryRunner.commitTransaction();
                return { success: true, message: 'Payment successful for product order' };
            }
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Error verifying payment', error.stack);
            throw new BadRequestException('Failed to process payment verification');
        } finally {
            await queryRunner.release();
        }
    }
}
