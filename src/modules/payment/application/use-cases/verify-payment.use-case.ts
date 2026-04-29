import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IPaymentGateway, PAYMENT_GATEWAY } from '@/external/payment/payment-gateway.interface';
import { PaymentOrder, PaymentStatus } from '../../infrastructure/persistence/entities/payment-order.entity';
import { VerifyPaymentDto } from '../../api/dto/verify-payment.dto';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { OrderFacade } from '@/modules/order/application/order.facade';
import { PaymentPolicy } from '../../domain/policies/payment.policy';
import { DomainError } from '@/common/types/domain.error';
import { PaymentVerificationFailedError } from '../../domain/errors/payment.errors';

@Injectable()
export class VerifyPaymentUseCase {
    private readonly logger = new Logger(VerifyPaymentUseCase.name);

    constructor(
        @InjectRepository(PaymentOrder)
        private paymentOrderRepo: Repository<PaymentOrder>,
        @Inject(PAYMENT_GATEWAY)
        private paymentGateway: IPaymentGateway,
        private walletFacade: WalletFacade,
        private orderFacade: OrderFacade,
        private dataSource: DataSource,
    ) { }

    async execute(dto: VerifyPaymentDto) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

        // 1. Signature Verification (Independent of DB)
        if (razorpay_signature) {
            const isValid = this.paymentGateway.verifySignature({
                providerOrderId: razorpay_order_id,
                providerPaymentId: razorpay_payment_id,
                signature: razorpay_signature,
            });
            PaymentPolicy.ensurePaymentSignatureValid(isValid);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 2. Fetch PaymentOrder with PESSIMISTIC LOCK
            const order = await queryRunner.manager.findOne(PaymentOrder, {
                where: { razorpay_order_id: razorpay_order_id },
                lock: { mode: 'pessimistic_write' }
            });

            PaymentPolicy.ensureOrderExists(order);

            // 3. Early exit if already processed
            if (order!.status === PaymentStatus.SUCCESS) {
                await queryRunner.rollbackTransaction(); 
                return { success: true, message: 'Payment already verified' };
            }

            // 4. Mark as success
            order!.status = PaymentStatus.SUCCESS;
            order!.razorpay_payment_id = razorpay_payment_id;
            order!.razorpay_signature = razorpay_signature || '';
            await queryRunner.manager.save(order);

            const isProduct = order!.notes?.type === 'product' || order!.notes?.is_order === true || order!.notes?.isOrder === true;

            if (!isProduct) {
                // Case 1: Wallet Recharge
                await this.walletFacade.topUp(order!.user_id!, order!.amount, `razorpay_${razorpay_payment_id}`, queryRunner);
                await queryRunner.commitTransaction();
                return { success: true, message: 'Payment successful and wallet updated' };
            } else {
                // Case 2: Product Purchase
                await this.orderFacade.markAsPaid(order!.razorpay_order_id!, queryRunner);
                this.logger.log(`Product payment verified for order ${order!.razorpay_order_id}`);
                await queryRunner.commitTransaction();
                return { success: true, message: 'Payment successful for product order' };
            }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            this.logger.error('Error verifying payment', error.stack);
            if (error instanceof DomainError) {
                throw error;
            }
            throw new PaymentVerificationFailedError();
        } finally {
            await queryRunner.release();
        }
    }
}
