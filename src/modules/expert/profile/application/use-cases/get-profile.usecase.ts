import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class GetProfileUseCase {
  private readonly logger = new Logger(GetProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly expertGateway: ExpertGateway,
  ) { }

  async execute(user: User, queryRunner?: QueryRunner) {
    const repo = queryRunner ? queryRunner.manager.getRepository(ProfileExpert) : this.profileRepo;
    const profile = await repo.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'addresses', 'pujas'],
    });

    if (!profile) {
      throw new NotFoundException(`Expert profile for user ${user.id} not found`);
    }

    this.logger.log(`Found profile for user ${user.id}: ${JSON.stringify(profile ? 'found' : 'not found')}`);
    
    const plain = { ...profile } as any;

    try {
      // Remove circular references from relations to avoid JSON serialization errors
      if (plain.pujas) {
        this.logger.log(`Processing ${plain.pujas.length} pujas`);
        plain.pujas = plain.pujas.map((p: any) => {
          const { expert, ...rest } = p;
          return rest;
        });
      }

      if (plain.addresses) {
        this.logger.log(`Processing ${plain.addresses.length} addresses`);
        plain.addresses = plain.addresses.map((a: any) => {
          const { profile_expert, profile_client, ...rest } = a;
          return rest;
        });
      }

      plain.languages = profile.languages
        ? profile.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        : [];
      
      plain.userId = profile.user?.id;
      plain.isAvailable = profile.is_available;
      
      if (profile.user?.id) {
          this.logger.log(`Checking online status for expert ${profile.user.id}`);
          plain.is_online = this.expertGateway.isExpertOnline(profile.user.id);
      } else {
          plain.is_online = false;
      }
      
      plain.total_likes = (profile as any).total_likes || 0;
      plain.custom_services = profile.custom_services || [];

      this.logger.log(`Returning profile for user ${user.id}`);
    } catch (err) {
      this.logger.error(`Error processing profile for user ${user.id}: ${err.message}`, err.stack);
      throw err;
    }

    return plain;
  }
}
