import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { DataSource } from 'typeorm';
import {
  ExpertAlreadyInWishlistError,
  ExpertNotFoundError,
  UserNotFoundError,
  NotAnExpertError,
} from '../../domain/errors/wishlist.errors';

@Injectable()
export class AddExpertToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly clientProfileFacade: ClientProfileFacade,
    private readonly expertProfileFacade: ExpertProfileFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, expert_id: string): Promise<BooleanMessage> {
    const client = await this.clientProfileFacade.getProfile(userId);
    if (!client) {
      throw new UserNotFoundError();
    }

    let expert = await this.expertProfileFacade.getExpertByUserId(expert_id);
    if (!expert) {
      expert = await this.expertProfileFacade.getExpertById(expert_id);
    }
    
    if (!expert) {
      throw new ExpertNotFoundError(expert_id);
    }
    
    const existing = await this.wishlistRepository.findOne({
      where: { client_id: client.id, expert_id: expert.id },
    });

    if (existing) {
      throw new ExpertAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      client_id: client.id,
      expert_id: expert.id,
    });

    const savedWishlist = await this.wishlistRepository.save(wishlist);

    // Update total_likes for the expert using QueryRunner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const currentLikes = Number(expert.total_likes) || 0;
      await this.expertProfileFacade.updateProfileWithQueryRunner(expert.user_id || expert.id, { total_likes: currentLikes + 1 }, queryRunner);
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
