import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { IUser } from '@/common/types/access-token.payload';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class GetProfileUseCase {
  private readonly logger = new Logger(GetProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly expertGateway: ExpertGateway,
  ) {}

  async execute(user: IUser, queryRunner?: QueryRunner) {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(ProfileExpert)
      : this.profileRepo;
    const where = user.profile
      ? { id: user.profile, user: { id: user.id } }
      : { user: { id: user.id } };
    const profile = await repo.findOne({
      where,
      relations: ['user', 'addresses', 'pujas'],
    });

    if (!profile) {
      // Instead of throwing 404, we return a stub so the frontend knows they are authenticated and need to complete onboarding
      return {
        id: null,
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
        }
      } as any;
    }

    this.logger.log(
      `Found profile for user ${user.id}: ${JSON.stringify(profile ? 'found' : 'not found')}`,
    );

    const plain: Record<string, unknown> = { ...profile };

    try {
      // Remove circular references from relations to avoid JSON serialization errors
      if (Array.isArray(plain.pujas)) {
        this.logger.log(`Processing ${plain.pujas.length} pujas`);
        plain.pujas = (plain.pujas as unknown[]).map(
          (p: Record<string, unknown>) => {
            const { expert: _expert, ...rest } = p;
            return rest;
          },
        );
      }

      if (Array.isArray(plain.addresses)) {
        this.logger.log(`Processing ${plain.addresses.length} addresses`);
        plain.addresses = (plain.addresses as unknown[]).map(
          (a: Record<string, unknown>) => {
            const { profile_expert: _pe, profile_client: _pc, ...rest } = a;
            return rest;
          },
        );
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
      this.logger.error(
        `Error processing profile for user ${user.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }

    return plain;
  }
}
