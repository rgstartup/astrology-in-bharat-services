import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, FindOneOptions } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { IUser } from '@/common/decorators/current-user.decorator';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
  ) { }

  async execute(user: IUser, queryRunner?: QueryRunner) {
    const profileRepo = queryRunner ? queryRunner.manager.getRepository(ProfileClient) : this.repo;

    const findOptions: FindOneOptions<ProfileClient> = {
      where: { user: { id: user.id } },
      relations: ['user'],
    }

    if(user.profile){
      findOptions.where = { 
        ...findOptions.where,
        id: user.profile
       };
    }

    const profile = await profileRepo.findOne(findOptions);

    if(!profile){
      throw new NotFoundException('No client profile found for the user');
    }


    // if (!profile) {
    //   const existingUser = await this.findUserUseCase.findById(user.id, queryRunner);


      
    //   const roles = existingUser?.roles || [];
    //   const hasClientRole = hasRoles(roles, 'CLIENT');
    //   const hasExpertRole = hasRoles(roles, 'EXPERT');

    //   if (hasExpertRole && !hasClientRole) {
    //     throw new ForbiddenException('Aap ek Expert hain. Kripya Expert Dashboard se login karein.');
    //   }

    //   // If it's a client but no profile, return null or a basic structure
    //   // We return null so the frontend knows it needs to be created
    //   return null;
    // }

    // Backend decides the final profile picture:
    // 1. If user manually uploaded a picture → use that (profile.profile_picture)
    // 2. Otherwise fallback to Gmail/OAuth avatar (profile.user.avatar)
    // const resolvedProfilePicture = profile.profile_picture || profile.user?.avatar || null;

    return profile;

  }
}
