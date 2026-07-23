import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';
import { UpdateProfileExpertDto } from '../../api/dto/profile-expert.dto';
import { Address, AddressTag } from '@/common/address/address.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfilePolicy } from '../../domain/policies/profile.policy';
import {
  ProfileUpdatedEvent,
  ExpertStatusChangedEvent,
} from '../../domain/events/profile-events';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(user: IUser, dto: UpdateProfileExpertDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const whereClause = user.profile
        ? { id: user.profile, user: { id: user.id } }
        : { user: { id: user.id } };
      let profile = await queryRunner.manager.findOne(ProfileExpert, {
        where: whereClause,
        relations: ['addresses'],
      });

      if (!profile) {
        // If profile doesn't exist (old users), create it on the fly
        profile = queryRunner.manager.create(ProfileExpert, {
          user: { id: user.id } as unknown as User,
          is_available: false,
        });
        await queryRunner.manager.save(ProfileExpert, profile);
        profile = await queryRunner.manager.findOne(ProfileExpert, {
          where: whereClause,
          relations: ['addresses'],
        });
      }

      ProfilePolicy.ensureProfileExists(profile);

      this.logger.log(`Updating profile for user ${user.id}`);

      if (dto.gender !== undefined) profile!.gender = dto.gender;
      if (dto.date_of_birth !== undefined) {
        profile!.date_of_birth = dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : null;
      }
      if (dto.specialization !== undefined)
        profile!.specialization = dto.specialization;
      if (dto.bio !== undefined) profile!.bio = dto.bio;
      if (dto.about !== undefined) profile!.about = dto.about;
      if (dto.experience_in_years !== undefined)
        profile!.experience_in_years = dto.experience_in_years;

      if (dto.price !== undefined) {
        this.logger.log(`Updating price to ${dto.price}`);
        profile!.price = dto.price;
      }
      if (dto.chat_price !== undefined) {
        this.logger.log(`Updating chat_price to ${dto.chat_price}`);
        profile!.chat_price = dto.chat_price;
      }
      if (dto.call_price !== undefined) {
        this.logger.log(`Updating call_price to ${dto.call_price}`);
        profile!.call_price = dto.call_price;
      }
      if (dto.video_call_price !== undefined) {
        this.logger.log(`Updating video_call_price to ${dto.video_call_price}`);
        profile!.video_call_price = dto.video_call_price;
      }
      if (dto.report_price !== undefined) {
        this.logger.log(`Updating report_price to ${dto.report_price}`);
        profile!.report_price = dto.report_price;
      }
      if (dto.horoscope_price !== undefined) {
        this.logger.log(`Updating horoscope_price to ${dto.horoscope_price}`);
        profile!.horoscope_price = dto.horoscope_price;
      }
      if (dto.custom_services !== undefined) {
        this.logger.log(
          `Updating custom_services: ${JSON.stringify(dto.custom_services)}`,
        );
        profile!.custom_services = dto.custom_services as unknown as Record<
          string,
          unknown
        >[];
      }
      if (dto.bank_details !== undefined) profile!.bank_details = dto.bank_details;

      if (dto.documents !== undefined) {
        if (profile!.kyc_status === 'approved' || profile!.kyc_status === 'active') {
          throw new ForbiddenException(
            'Your account is verified. You cannot modify your verified documents. Please contact Admin.',
          );
        }
        profile!.documents = dto.documents as unknown as Record<string, unknown>[];
      }
      if (dto.gallery !== undefined) profile!.gallery = dto.gallery;
      if (dto.videos !== undefined) profile!.videos = dto.videos;
      if (dto.video !== undefined) profile!.video = dto.video;
      if (dto.certificates !== undefined) profile!.certificates = dto.certificates;

      if (dto.detailed_experience !== undefined)
        profile!.detailed_experience =
          dto.detailed_experience as unknown as Record<string, unknown>[];

      if ((dto as unknown as { languages: string[] }).languages) {
        profile!.languages = (
          dto as unknown as { languages: string[] }
        ).languages.join(',');
      }

      if (
        (dto as unknown as { phone_number?: string }).phone_number !== undefined
      ) {
        profile!.phone_number = (dto as unknown as { phone_number?: string })
          .phone_number as string;
      }

      if (dto.addresses) {
        if (profile!.addresses && profile!.addresses.length > 0) {
          await queryRunner.manager.remove(Address, profile!.addresses);
        }

        profile!.addresses = dto.addresses.map((addr: Partial<Address>) =>
          queryRunner.manager.create(Address, {
            line1: addr.line1 || '',
            house_no: addr.house_no,
            city: addr.city,
            district: addr.district,
            state: addr.state,
            country: addr.country,
            zip_code: addr.zip_code || addr.pincode || '',
            pincode: addr.pincode,
            tag: addr.tag || AddressTag.OTHER,
          }),
        );
      }

      if (dto.avatar !== undefined) {
        await queryRunner.manager.update(User, { id: user.id }, { avatar: dto.avatar });
      }

      if ((dto as unknown as { name?: string }).name !== undefined) {
        const newName = (dto as unknown as { name?: string }).name as string;
        const currentUser = await queryRunner.manager.findOne(User, { where: { id: user.id } });
        
        const currentNameStr = currentUser?.name?.trim() || "";
        const newNameStr = newName?.trim() || "";

        if (currentNameStr !== newNameStr && currentNameStr !== "") {
          if (profile!.kyc_status === 'approved' || profile!.kyc_status === 'active') {
            throw new ForbiddenException(
              'Your account is verified. You cannot change your name. Please contact Admin.',
            );
          }
        }
        
        await queryRunner.manager.update(User, { id: user.id }, {
          name: newNameStr || null,
        });
      }

      const savedProfile = await queryRunner.manager.save(ProfileExpert, profile!);

      await queryRunner.commitTransaction();

      // Emit events
      this.eventEmitter.emit(
        'expert.profile.updated',
        new ProfileUpdatedEvent(
          user.id as unknown as string,
          savedProfile.id as unknown as string,
          dto,
        ),
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

      return new BooleanMessage();
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
