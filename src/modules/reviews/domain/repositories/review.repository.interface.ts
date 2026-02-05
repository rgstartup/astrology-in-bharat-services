import { Review } from '../entities/review.entity';

export interface IReviewRepository {
    create(data: Partial<Review>): Review;
    save(review: Review): Promise<Review>;
    findOne(options: any): Promise<Review | null>;
    findAndCount(options: any): Promise<[Review[], number]>;
    getAverageRatingAndCount(expertId: number): Promise<{ average: number; count: number }>;
}

export const IReviewRepository = Symbol('IReviewRepository');
