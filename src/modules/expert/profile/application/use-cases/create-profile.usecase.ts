import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';
import { CreateProfileExpertDto } from '../../api/dto/profile-expert.dto';
import { Address } from '@/common/address/address.entity';
import { ExpertGateway } from '../../api/gateways/expert.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ProfileUpdatedEvent,
  ExpertStatusChangedEvent,
} from '../../domain/events/profile-events';

@Injectable()
export class CreateProfileUseCase {
  private readonly logger = new Logger(CreateProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly expertGateway: ExpertGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    user: IUser,
    dto: CreateProfileExpertDto,
    queryRunner?: QueryRunner,
  ) {
    const profileRepo = queryRunner
      ? queryRunner.manager.getRepository(ProfileExpert)
      : this.profileRepo;
    const _addressRepo = queryRunner
      ? queryRunner.manager.getRepository(Address)
      : this.addressRepo;

    try {
      const exists = await profileRepo.findOne({
        where: { user: { id: user.id } },
      });

      if (exists) {
        throw new BadRequestException('Expert profile already exists');
      }

      const profileData: Partial<ProfileExpert> = {
        user: { id: user.id } as unknown as User,
        gender: dto.gender,
        date_of_birth: dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : undefined,
        specialization: dto.specialization,
        bio: dto.bio,
        about: dto.about,
        experience_in_years: dto.experience_in_years,
        languages: dto.languages ? dto.languages.join(',') : undefined,
        phone_number: dto.phone_number,
        price: dto.price,
        chat_price: dto.chat_price,
        call_price: dto.call_price,
        video_call_price: dto.video_call_price,
        report_price: dto.report_price,
        horoscope_price: dto.horoscope_price,
        custom_services: dto.custom_services as Record<string, unknown>[],
        bank_details: dto.bank_details,
        is_available: dto.is_available,
        documents: dto.documents as unknown as Record<string, unknown>[],
        gallery: dto.gallery,
        videos: dto.videos,
        video: dto.video,
        certificates: dto.certificates,
        detailed_experience: dto.detailed_experience as Record<
          string,
          unknown
        >[],
        addresses:
          dto.addresses?.map((addr) =>
            this.addressRepo.create({
              line1:
                [addr.line1, addr.line2].filter(Boolean).join(', ') ||
                addr.house_no ||
                '',
              house_no: addr.house_no,
              city: addr.city,
              district: addr.district,
              state: addr.state,
              country: addr.country,
              zip_code: addr.zip_code || addr.pincode || '',
              pincode: addr.pincode,
            }),
          ) ?? [],
      };

      const profile = profileRepo.create(profileData);
      const savedProfile = await profileRepo.save(profile);

      // Emit events
      this.eventEmitter.emit(
        'expert.profile.updated',
        new ProfileUpdatedEvent(user.id, savedProfile.id, dto),
      );

      if (dto.is_available !== undefined) {
        this.eventEmitter.emit(
          'expert.status.changed',
          new ExpertStatusChangedEvent(
            user.id as unknown as string,
            dto.is_available,
          ),
        );
      }

      return this.getProfileData(user, queryRunner);
    } catch (error) {
      this.logger.error(
        `Failed to create profile for user: ${user.id}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async getProfileData(user: IUser, queryRunner?: QueryRunner) {
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
      return {
        id: null,
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
        }
      } as any;
    }

    const plain: Record<string, unknown> = { ...profile };

    try {
      if (Array.isArray(plain.pujas)) {
        plain.pujas = (plain.pujas as unknown[]).map(
          (p: Record<string, unknown>) => {
            const { expert: _expert, ...rest } = p;
            return rest;
          },
        );
      }

      if (Array.isArray(plain.addresses)) {
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
        plain.is_online = this.expertGateway.isExpertOnline(profile.user.id);
      } else {
        plain.is_online = false;
      }

      plain.total_likes = (profile as any).total_likes || 0;
      plain.custom_services = profile.custom_services || [];
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
