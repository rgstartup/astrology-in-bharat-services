import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../infrastructure/persistence/entities/review.entity';

@Injectable()
export class GetApprovedPlatformReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(limit: number = 6) {
    const reviews = await this.reviewRepository.find({
      where: { review_type: 'platform', status: 'approved' },
      relations: ['user', 'user.profile_client'],
      order: { created_at: 'DESC' },
      take: limit,
    });

    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:6543/';

    const mappedReviews = reviews.map(r => {
      const rawAvatar = r.user?.avatar || (r.user as any)?.profile_client?.profile_picture;
      const fullAvatar = rawAvatar 
        ? (rawAvatar.startsWith('http') ? rawAvatar : `${baseUrl.replace(/\/$/, '')}/${rawAvatar.replace(/^\//, '')}`)
        : null;

      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        tags: r.tags,
        created_at: r.created_at,
        user: {
          name: r.user?.name || 'Anonymous',
          avatar: fullAvatar,
        },
      };
    });

    return mappedReviews;
  }
}
