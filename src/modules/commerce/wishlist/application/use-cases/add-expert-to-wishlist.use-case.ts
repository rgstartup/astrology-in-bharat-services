// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../infrastructure/entities/wishlist.entity';
import { FindUserUseCase } from '@/modules/users/application/use-cases/find-user.usecase';
import { GetExpertByIdUseCase } from '@/modules/expert/profile/application/use-cases/get-expert-by-id.usecase';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import {
  ExpertAlreadyInWishlistError,
  ExpertNotFoundError,
  UserNotFoundError,
  NotAnExpertError,
} from '../../domain/errors/wishlist.errors';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class AddExpertToWishlistUseCase {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly findUserUseCase: FindUserUseCase,
    private readonly getExpertByIdUseCase: GetExpertByIdUseCase,
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepository: Repository<ProfileExpert>,
  ) {}

  async execute(userId: number, expertId: number): Promise<Wishlist> {
    let expertUser;
    let foundViaProfile = false;

    try {
      expertUser = await this.findUserUseCase.findById(expertId);
    } catch (e) {
      // User not found, fall back to checking if expertId is a ProfileExpert ID
    }

    if (!expertUser) {
      try {
        const expertDto = await this.getExpertByIdUseCase.execute(expertId);
        expertUser = await this.findUserUseCase.findById(expertDto.userId);

        

        expertId = expertUser.id;
        foundViaProfile = true;
      } catch (e) {
        throw new ExpertNotFoundError(expertId);
      }
    }

    const hasExpertRole =
      expertUser.roles && expertUser.roles.includes(RoleEnum.EXPERT);

    if (!hasExpertRole && !foundViaProfile) {
      const roleNames = expertUser.roles
        ? expertUser.roles.join(', ')
        : 'No roles';
      throw new NotAnExpertError(expertId, roleNames);
    }

    const finalExpertId = expertUser.id;

    let user;
    try {
      user = await this.findUserUseCase.findById(userId);
    } catch (e) {
      throw new UserNotFoundError();
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user: { id: userId }, expert: { id: finalExpertId } },
    });

    if (existing) {
      throw new ExpertAlreadyInWishlistError();
    }

    const wishlist = this.wishlistRepository.create({
      user,
      expert: expertUser,
    });

    const savedWishlist = await this.wishlistRepository.save(wishlist);

    const profileExpert = await this.profileExpertRepository.findOne({
      where: { user: { id: finalExpertId } },
    });
    
    if (profileExpert) {
      const currentLikes = Number(profileExpert.total_likes) || 0;
      profileExpert.total_likes = currentLikes + 1;
      await this.profileExpertRepository.save(profileExpert);
    }

    return savedWishlist;
  }
}
