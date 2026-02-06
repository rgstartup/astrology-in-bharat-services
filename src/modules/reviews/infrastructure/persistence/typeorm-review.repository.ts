import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '@/modules/reviews/domain/entities/review.entity';
import { IReviewRepository } from '../../domain/repositories/review.repository.interface';

@Injectable()
export class TypeOrmReviewRepository implements IReviewRepository {
    constructor(
        @InjectRepository(Review)
        private readonly repository: Repository<Review>,
    ) { }

    create(data: Partial<Review>): Review {
        return this.repository.create(data);
    }

    async save(review: Review): Promise<Review> {
        return this.repository.save(review);
    }

    async findOne(options: any): Promise<Review | null> {
        return this.repository.findOne(options);
    }

    async findAndCount(options: any): Promise<[Review[], number]> {
        return this.repository.findAndCount(options);
    }

    async getAverageRatingAndCount(expertId: number): Promise<{ average: number; count: number }> {
        const result = await this.repository
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'average')
            .addSelect('COUNT(review.id)', 'count')
            .where('review.expertId = :expertId', { expertId })
            .getRawOne();

        return {
            average: result.average ? parseFloat(result.average) : 0,
            count: result.count ? parseInt(result.count, 10) : 0,
        };
    }
}
