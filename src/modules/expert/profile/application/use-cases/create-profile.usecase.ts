import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
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

  async execute(user: User, dto: CreateProfileExpertDto) {
    try {
      const exists = await this.profileRepo.findOne({
        where: { user: { id: user.id } },
      });

      if (exists) {
        throw new BadRequestException('Expert profile already exists');
      }

      const profileData: Partial<ProfileExpert> = {
        user: { id: user.id } as any,
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

      const profile = this.profileRepo.create(profileData);
      const savedProfile = await this.profileRepo.save(profile);

      // Emit events
      this.eventEmitter.emit(
        'expert.profile.updated',
        new ProfileUpdatedEvent(user.id, savedProfile.id, dto),
      );

      if (dto.is_available !== undefined) {
        this.eventEmitter.emit(
          'expert.status.changed',
          new ExpertStatusChangedEvent(user.id, dto.is_available),
        );
      }

      return this.getProfileUseCase.execute(user);
    } catch (error) {
      this.logger.error(`Failed to create profile for user: ${user.id}`, error.stack);
      throw error;
    }
  }
}
