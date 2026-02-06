import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from '@/modules/chat/domain/entities/chat-session.entity';
import { User } from '@/modules/users/domain/entities/user.entity';
import { Transaction } from '@/modules/wallet/domain/entities/transaction.entity';
import { Wallet } from '@/modules/wallet/domain/entities/wallet.entity';
import { CouponService } from './application/services/coupon.service';
import { Coupon } from './domain/entities/coupon.entity';
import { UserCoupon } from './domain/entities/user-coupon.entity';
import { ICouponRepository } from './domain/repositories/coupon.repository.interface';
import { IUserCouponRepository } from './domain/repositories/user-coupon.repository.interface';
import { TypeOrmCouponRepository } from './infrastructure/persistence/typeorm-coupon.repository';
import { TypeOrmUserCouponRepository } from './infrastructure/persistence/typeorm-user-coupon.repository';
import { CouponController, AdminCouponController, AdminUserFilterController } from './interfaces/controllers/coupon.controller';

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
            provide: ICouponRepository,
            useClass: TypeOrmCouponRepository,
        },
        {
            provide: IUserCouponRepository,
            useClass: TypeOrmUserCouponRepository,
        },
    ],
    exports: [CouponService],
})
export class CouponModule { }
