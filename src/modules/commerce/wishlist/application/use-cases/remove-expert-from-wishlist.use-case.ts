
import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';
import { ExpertNotInWishlistError, UserNotFoundError } from '../../domain/errors/wishlist.errors';
import { DataSource } from 'typeorm';

@Injectable()
export class RemoveExpertFromWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly expertProfileFacade: ExpertProfileFacade,
    private readonly clientProfileFacade: ClientProfileFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, expert_id: string): Promise<{ message: string }> {
    const client = await this.clientProfileFacade.getProfile(userId);
    if (!client) {
      throw new UserNotFoundError();
    }

    const result = await this.wishlistRepository.delete({ client_id: client.id, expert_id: expert_id });

    if (result.affected === 0) {
      throw new ExpertNotInWishlistError();
    }

    let profileExpert = await this.expertProfileFacade.getExpertByUserId(expert_id);
    if (!profileExpert) {
      profileExpert = await this.expertProfileFacade.getExpertById(expert_id);
    }
    
    if (profileExpert) {
      const currentLikes = profileExpert.total_likes || 0;
      if (currentLikes > 0) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          await this.expertProfileFacade.updateProfileWithQueryRunner(profileExpert.user_id || profileExpert.id, { total_likes: currentLikes - 1 }, queryRunner);
          await queryRunner.commitTransaction();
        } catch (err) {
          await queryRunner.rollbackTransaction();
          console.error('Failed to decrement total likes:', err);
        } finally {
          await queryRunner.release();
        }
      }
    }

    return new BooleanMessage();
  }
}
