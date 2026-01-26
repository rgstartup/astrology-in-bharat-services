import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { ChatSession } from '@/modules/chat/entities/chat-session.entity';
import { WalletModule } from '@/modules/wallet/wallet.module'; // Likely needed if we reward users, but skipped for now

@Module({
    imports: [
        TypeOrmModule.forFeature([Review, ProfileExpert, ChatSession]),
    ],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }
