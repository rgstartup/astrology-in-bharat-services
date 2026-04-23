import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';
import { CreateProfileExpertDto } from '../../api/dto/profile-expert.dto';
import { Address } from '@/common/address/address.entity';
import { GetProfileUseCase } from './get-profile.usecase';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileUpdatedEvent, ExpertStatusChangedEvent } from '../../domain/events/profile-events';

@Injectable()
export class CreateProfileUseCase {
  private readonly logger = new Logger(CreateProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(userId: string, dto: CreateProfileExpertDto, queryRunner?: QueryRunner) {
    const profileRepo = queryRunner ? queryRunner.manager.getRepository(ProfileExpert) : this.profileRepo;
    const addressRepo = queryRunner ? queryRunner.manager.getRepository(Address) : this.addressRepo;

    try {
      const exists = await profileRepo.findOne({
        where: { better_auth_user_id: userId },
      });

      if (exists) {
        throw new BadRequestException('Expert profile already exists');
      }

      const profileData: Partial<ProfileExpert> = {
        better_auth_user_id: userId,
        gender: dto.gender,
        date_of_birth: dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : undefined,
        specialization: dto.specialization,
        bio: dto.bio,
        experience_in_years: dto.experience_in_years,
        languages: dto.languages ? dto.languages.join(',') : undefined,
        phone_number: dto.phone_number,
        price: dto.price,
        chat_price: dto.chat_price,
        call_price: dto.call_price,
        video_call_price: dto.video_call_price,
        report_price: dto.report_price,
        horoscope_price: dto.horoscope_price,
        custom_services: dto.custom_services,
        bank_details: dto.bank_details,
        is_available: dto.is_available,
        documents: dto.documents,
        gallery: dto.gallery,
        videos: dto.videos,
        video: dto.video,
        certificates: dto.certificates,
        detailed_experience: dto.detailed_experience,
        addresses:
          dto.addresses?.map((addr) =>
            addressRepo.create({
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

      // Emit events using the string userId
      this.eventEmitter.emit(
        'expert.profile.updated',
        new ProfileUpdatedEvent(userId, savedProfile.id, dto),
      );

      if (dto.is_available !== undefined) {
        this.eventEmitter.emit(
          'expert.status.changed',
          new ExpertStatusChangedEvent(userId, dto.is_available),
        );
      }

      return this.getProfileUseCase.execute(userId, queryRunner);
    } catch (error) {
      this.logger.error(`Failed to create profile for user: ${userId}`, error.stack);
      throw error;
    }
  }
}
