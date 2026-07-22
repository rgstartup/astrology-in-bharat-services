import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { DataSource } from 'typeorm';
import {
  ExpertAlreadyInWishlistError,
  ExpertNotFoundError,
  UserNotFoundError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class AddExpertToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly expertProfileFacade: ExpertProfileFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(profileId: string, expert_id: string): Promise<BooleanMessage> {
    if (!profileId) {
      throw new UserNotFoundError();
    }

    let expert = await this.expertProfileFacade.getExpertByUserId(expert_id);
    if (!expert) {
      expert = (await this.expertProfileFacade.getExpertById(
        expert_id,
      )) as unknown as ProfileExpert;
    }

    if (!expert) {
      throw new ExpertNotFoundError(expert_id);
    }

    const existing = await this.wishlistRepository.findOne({
      where: { client_id: profileId, expert_id: expert.id },
    });

    if (existing) {
      throw new ExpertAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client_id: profileId,
      expert_id: expert.id,
    });

    const _savedWishlist = await this.wishlistRepository.save(wishlist);

    // Update total_likes for the expert using QueryRunner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const currentLikes = Number(expert.total_likes) || 0;
      await queryRunner.manager.update(
        ProfileExpert,
        { id: expert.id },
        { total_likes: currentLikes + 1 },
      );
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Failed to update total likes:', err);
    } finally {
      await queryRunner.release();
    }

    return new BooleanMessage();
  }
}
