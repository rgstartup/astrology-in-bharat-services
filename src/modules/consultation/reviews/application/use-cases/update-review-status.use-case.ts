import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../../infrastructure/entities/review.entity';

@Injectable()
export class UpdateReviewStatusUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async execute(id: string, status: string) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }

    const result = await this.reviewRepository.update(id, { status });

    if(!result.affected){
        throw new NotFoundException(`Review with id ${id} not found`);
    }

    if (review.expert_id) {
      await this.updateExpertRating(review.expert_id as string);
    }
    if (review.merchant_id) {
      await this.updateMerchantRating(review.merchant_id as string);
    }

    return new BooleanMessage(true, 'Review Updated Successfully');
  } 

  private async updateExpertRating(expert_id: string) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.expert_id = :expert_id', { expert_id })
      .andWhere('review.status = :status', { status: 'approved' })
      .getRawOne<{ average: string | null; count: string | null }>();

    const average = result?.average
      ? parseFloat(parseFloat(result?.average).toFixed(1))
      : 0;
    const count = result?.count ? parseInt(result?.count, 10) : 0;

    await this.dataSource
      .createQueryBuilder()
      .update('expert.profile')
      .set({ rating: average, total_reviews: count })
      .where('id = :expert_id', { expert_id })
      .execute();
  }

  private async updateMerchantRating(merchantId: string) {
    const result = (await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.merchant_id = :merchantId', { merchantId })
      .andWhere('review.status = :status', { status: 'approved' })
      .getRawOne<{ average: string | null; count: string | null }>()) ?? {
      average: null,
      count: null,
    };

    const average = result.average
      ? parseFloat(parseFloat(result.average).toFixed(1))
      : 0;
    const count = result.count ? parseInt(result.count, 10) : 0;

    await this.dataSource
      .createQueryBuilder()
      .update('merchant.profile')
      .set({ rating: average, reviewCount: count })
      .where('id = :merchantId', { merchantId })
      .execute();
  }
}
