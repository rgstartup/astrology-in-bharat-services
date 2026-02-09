import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './domain/entities/coupon';
import { UserCoupon } from './domain/entities/user-coupon';
import { User } from '../users/domain/entities/user.entity';
import { Transaction } from '../wallet/domain/entities/transaction.entity';
import { ChatSession } from '../chat/domain/entities/chat-session.entity';
import { Wallet } from '../wallet/domain/entities/wallet.entity';
import { CouponService } from './application/services/coupon.service';
import { CouponController, AdminCouponController, AdminUserFilterController } from './interfaces/controllers/coupon.controller';
import { TypeOrmUserCouponRepository } from './infrastructure/persistence/repositories/typeorm-user-coupon.repository';
import { TypeOrmCouponRepository } from './infrastructure/persistence/repositories/typeorm-coupon.repository';

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
    providers: [
        CouponService,
        {
            provide: 'ICouponRepository',
            useClass: TypeOrmCouponRepository,
        },
        {
            provide: 'IUserCouponRepository',
            useClass: TypeOrmUserCouponRepository,
        },
        TypeOrmCouponRepository,
        TypeOrmUserCouponRepository
    ],
    exports: [CouponService],
})
export class CouponModule { }
