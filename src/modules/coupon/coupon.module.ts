import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { ChatSession } from '../chat/entities/chat-session.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { CouponService } from './coupon.service';
import { CouponController, AdminCouponController, AdminUserFilterController } from './coupon.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Coupon,
            UserCoupon,
            User,
            Transaction,
            ChatSession,
            Wallet,
        ])
    ],
    controllers: [CouponController, AdminCouponController, AdminUserFilterController],
    providers: [CouponService],
    exports: [CouponService],
})
export class CouponModule { }
