import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';
import { UpdateProfileExpertDto } from '../../api/dto/profile-expert.dto';
import { Address } from '@/common/address/address.entity';
import { GetProfileUseCase } from './get-profile.usecase';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfilePolicy } from '../../domain/policies/profile.policy';
import { ProfileUpdatedEvent, ExpertStatusChangedEvent } from '../../domain/events/profile-events';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(userId: string, dto: UpdateProfileExpertDto) {
    let profile = await this.profileRepo.findOne({
      where: { better_auth_user_id: userId },
      relations: ['addresses'],
    });

    if (!profile) {
      // If profile doesn't exist (old users), create it on the fly
      profile = this.profileRepo.create({
        better_auth_user_id: userId,
        is_available: false,
      });
      await this.profileRepo.save(profile);
      profile = await this.profileRepo.findOne({
        where: { better_auth_user_id: userId },
        relations: ['addresses'],
      });
    }

    ProfilePolicy.ensureProfileExists(profile);

    this.logger.log(`Updating profile for user ${userId}`);

    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.date_of_birth !== undefined) {
      profile.date_of_birth = dto.date_of_birth ? new Date(dto.date_of_birth) : null;
    }
    if (dto.specialization !== undefined) profile.specialization = dto.specialization;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.experience_in_years !== undefined) profile.experience_in_years = dto.experience_in_years;

    if (dto.price !== undefined) {
      this.logger.log(`Updating price to ${dto.price}`);
      profile.price = dto.price;
    }
    if (dto.chat_price !== undefined) {
      this.logger.log(`Updating chat_price to ${dto.chat_price}`);
      profile.chat_price = dto.chat_price;
    }
    if (dto.call_price !== undefined) {
      this.logger.log(`Updating call_price to ${dto.call_price}`);
      profile.call_price = dto.call_price;
    }
    if (dto.video_call_price !== undefined) {
      this.logger.log(`Updating video_call_price to ${dto.video_call_price}`);
      profile.video_call_price = dto.video_call_price;
    }
    if (dto.report_price !== undefined) {
      this.logger.log(`Updating report_price to ${dto.report_price}`);
      profile.report_price = dto.report_price;
    }
    if (dto.horoscope_price !== undefined) {
      this.logger.log(`Updating horoscope_price to ${dto.horoscope_price}`);
      profile.horoscope_price = dto.horoscope_price;
    }
    if (dto.custom_services !== undefined) {
      this.logger.log(`Updating custom_services: ${JSON.stringify(dto.custom_services)}`);
      profile.custom_services = dto.custom_services;
    }
    if (dto.bank_details !== undefined) profile.bank_details = dto.bank_details;

    if (dto.documents !== undefined) profile.documents = dto.documents;
    if (dto.gallery !== undefined) profile.gallery = dto.gallery;
    if (dto.videos !== undefined) profile.videos = dto.videos;
    if (dto.video !== undefined) profile.video = dto.video;
    if (dto.certificates !== undefined) profile.certificates = dto.certificates;

    if (dto.detailed_experience !== undefined) profile.detailed_experience = dto.detailed_experience;

    if ((dto as any).languages) {
      profile.languages = (dto as any).languages.join(',');
    }

    if ((dto as any).phone_number !== undefined) {
      profile.phone_number = (dto as any).phone_number;
    }

    if (dto.addresses) {
      if (profile.addresses && profile.addresses.length > 0) {
        await this.addressRepo.remove(profile.addresses);
      }

      profile.addresses = dto.addresses.map((addr: any) =>
        this.addressRepo.create({
          line1: [addr.line1, addr.line2].filter(Boolean).join(', ') || addr.house_no || '',
          house_no: addr.house_no,
          city: addr.city,
          district: addr.district,
          state: addr.state,
          country: addr.country,
          zip_code: addr.zip_code || addr.pincode || '',
          pincode: addr.pincode,
          tag: addr.tag || 'other',
        }),
      );
    }

    const savedProfile = await this.profileRepo.save(profile);

    // Emit events
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

    return this.getProfileUseCase.execute(userId);
  }
}
