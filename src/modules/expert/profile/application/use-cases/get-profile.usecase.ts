import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class GetProfileUseCase {
  private readonly logger = new Logger(GetProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly expertGateway: ExpertGateway,
  ) { }

  async execute(userId: string, queryRunner?: QueryRunner) {
    const repo = queryRunner ? queryRunner.manager.getRepository(ProfileExpert) : this.profileRepo;
    const profile = await repo.findOne({
      where: { better_auth_user_id: userId },
      relations: ['addresses', 'pujas'],
    });

    if (!profile) {
      throw new NotFoundException(`Expert profile for user ${userId} not found`);
    }

    this.logger.log(`Found profile for user ${userId}: ${JSON.stringify(profile ? 'found' : 'not found')}`);
    
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
          .map((lang: string) => lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase())
        : [];
      
      plain.userId = profile.better_auth_user_id;
      plain.isAvailable = profile.is_available;
      
      if (profile.better_auth_user_id) {
          this.logger.log(`Checking online status for expert ${profile.better_auth_user_id}`);
          plain.is_online = this.expertGateway.isExpertOnline(profile.better_auth_user_id);
      } else {
          plain.is_online = false;
      }
      
      plain.total_likes = (profile as any).total_likes || 0;
      plain.custom_services = profile.custom_services || [];

      this.logger.log(`Returning profile for user ${userId}`);
    } catch (err) {
      this.logger.error(`Error processing profile for user ${userId}: ${err.message}`, err.stack);
      throw err;
    }

    return plain;
  }
}
