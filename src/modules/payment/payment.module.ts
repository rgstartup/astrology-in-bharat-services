import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './application/services/payment.service';
import { PaymentController } from './interfaces/controllers/payment.controller';
import { PaymentOrder } from './domain/entities/payment-order.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { OrderModule } from '@/modules/order/order.module';
import { IPaymentOrderRepository } from './domain/repositories/payment-order.repository.interface';
import { TypeOrmPaymentOrderRepository } from './infrastructure/persistence/typeorm-payment-order.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([PaymentOrder]),
        WalletModule,
        OrderModule,
    ],
    providers: [
        PaymentService,
        {
            provide: IPaymentOrderRepository,
            useClass: TypeOrmPaymentOrderRepository,
        },
    ],
    controllers: [PaymentController],
    exports: [PaymentService],
})
export class PaymentModule { }
