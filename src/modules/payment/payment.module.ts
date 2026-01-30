import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentOrder } from './entities/payment-order.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { OrderModule } from '@/modules/order/order.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PaymentOrder]),
        WalletModule,
        OrderModule,
    ],
    providers: [PaymentService],
    controllers: [PaymentController],
    exports: [PaymentService],
})
export class PaymentModule { }
