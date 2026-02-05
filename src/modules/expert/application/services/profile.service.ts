import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThanOrEqual } from 'typeorm';

import { ProfileExpert } from '../../domain/entities/profile-expert.entity';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from '../dtos/profile-expert.dto';
import {
  ChatSession,
  ChatSessionStatus,
} from '@/modules/chat';
import { QueryExpertDto } from '../dtos/query-expert.dto';
import { Address } from '@/common/domain/entities/address.entity';
import { User } from '@/modules/users';

import { ExpertGateway } from '../../interfaces/gateways/expert.gateway';
import { MailService } from '@/modules/notification';
import { IExpertRepository } from '../../domain/repositories/expert.repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  constructor(
    @Inject(IExpertRepository)
    private readonly expertRepository: IExpertRepository,

    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,

    private readonly expertGateway: ExpertGateway,
    private readonly mailService: MailService,
  ) { }

  async getProfile(user: User) {
    const profile = await this.expertRepository.findByUserId(user.id);

    if (!profile) return null;

    const plain = { ...profile } as any;
    plain.languages = profile.languages
      ? profile.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      : [];
    plain.userId = profile.user?.id;
    plain.isAvailable = profile.is_available;
    plain.is_online = profile.user?.id
      ? this.expertGateway.isExpertOnline(profile.user.id)
      : false;
    plain.total_likes = (profile as any).total_likes || 0;
    plain.custom_services = profile.custom_services || [];

    this.logger.log(
      `Returning profile for user ${user.id}: ${JSON.stringify({ ...plain, user: undefined, addresses: undefined })}`,
    );

    return plain;
  }

  async createProfile(user: User, dto: CreateProfileExpertDto) {
    // check if exists already
    try {
      const exists = await this.expertRepository.findByUserId(user.id);
      console.log('createProfile called — user:', user);
      console.log('createProfile - dto:', dto);

      if (exists) {
        throw new BadRequestException('Expert profile already exists');
      }

      const profileData: Partial<ProfileExpert> = {
        user: { id: user.id } as any,
        // map simple scalar fields explicitly to avoid type mismatches
        gender: dto.gender,
        date_of_birth: dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : undefined,
        specialization: dto.specialization,
        bio: dto.bio,
        experience_in_years: dto.experience_in_years,
        // persist languages as CSV string to match entity column type
        languages: dto.languages ? dto.languages.join(',') : undefined,
        phoneNumber: dto.phoneNumber,
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
              // map DTO -> entity fields
              line1:
                [addr.line1, addr.line2].filter(Boolean).join(', ') ||
                addr.houseNo ||
                '',
              houseNo: addr.houseNo,
              city: addr.city,
              district: addr.district,
              state: addr.state,
              country: addr.country,
              zipCode: addr.zipCode || addr.pincode || '',
              pincode: addr.pincode,
            }),
          ) ?? [],
      };

      const profile = this.expertRepository.create(profileData as any);
      await this.expertRepository.save(profile);

      // Notify of status change if is_available is set
      if (dto.is_available !== undefined) {
        this.expertGateway.notifyStatusChange(user.id, dto.is_available);
      }

      return this.getProfile(user);
    } catch (error) {
      this.logger.error(`Failed to create profile for user: `, error.stack);
      throw error;
    }
  }

  async updateProfile(user: User, dto: UpdateProfileExpertDto) {
    let profile = await this.expertRepository.findByUserId(user.id);

    if (!profile) {
      // If profile doesn't exist (old users), create it on the fly
      profile = this.expertRepository.create({
        user: { id: user.id } as any,
        is_available: false,
      });
      await this.expertRepository.save(profile);
      profile = await this.expertRepository.findByUserId(user.id);
    }

    if (!profile)
      throw new NotFoundException('Expert profile could not be created');

    // Apply updates but handle `languages` (string[]) -> CSV string explicitly
    this.logger.log(
      `Updating profile for user ${user.id}. DTO: ${JSON.stringify(dto)}`,
    );
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.date_of_birth !== undefined) {
      this.logger.log(`Setting date_of_birth to: ${dto.date_of_birth}`);
      profile.date_of_birth = dto.date_of_birth
        ? new Date(dto.date_of_birth)
        : null;
    }
    if (dto.specialization !== undefined)
      profile.specialization = dto.specialization;
    if (dto.bio !== undefined) profile.bio = dto.bio;

    if (dto.experience_in_years !== undefined)
      profile.experience_in_years = dto.experience_in_years;

    if (dto.price !== undefined) profile.price = dto.price;
    if (dto.chat_price !== undefined) profile.chat_price = dto.chat_price;
    if (dto.call_price !== undefined) profile.call_price = dto.call_price;
    if (dto.video_call_price !== undefined)
      profile.video_call_price = dto.video_call_price;
    if (dto.report_price !== undefined) profile.report_price = dto.report_price;
    if (dto.horoscope_price !== undefined)
      profile.horoscope_price = dto.horoscope_price;
    if (dto.custom_services !== undefined)
      profile.custom_services = dto.custom_services;

    if (dto.bank_details !== undefined) profile.bank_details = dto.bank_details;
    if (dto.is_available !== undefined) {
      if (dto.is_available === false) {
        // Prevent going offline if there are active sessions
        const activeSession = await this.sessionRepo.findOne({
          where: { expertId: profile.id, status: ChatSessionStatus.ACTIVE },
        });
        if (activeSession) {
          throw new BadRequestException(
            'You cannot go offline while you have an active chat session. Please end the session first.',
          );
        }
      }
      profile.is_available = dto.is_available;
    }
    if (dto.documents !== undefined) profile.documents = dto.documents;
    if (dto.gallery !== undefined) profile.gallery = dto.gallery;
    if (dto.videos !== undefined) profile.videos = dto.videos;
    if (dto.video !== undefined) profile.video = dto.video;
    if (dto.certificates !== undefined) profile.certificates = dto.certificates;

    if (dto.detailed_experience !== undefined)
      profile.detailed_experience = dto.detailed_experience;

    if ((dto as any).languages) {
      profile.languages = (dto as any).languages.join(',');
    }

    if ((dto as any).phoneNumber !== undefined) {
      profile.phoneNumber = (dto as any).phoneNumber;
    }

    if (dto.addresses) {
      // Remove old addresses to prevent unique constraint violation
      if (profile.addresses && profile.addresses.length > 0) {
        await this.addressRepo.remove(profile.addresses);
      }

      profile.addresses = dto.addresses.map((addr: any) =>
        this.addressRepo.create({
          line1:
            [addr.line1, addr.line2].filter(Boolean).join(', ') ||
            addr.houseNo ||
            '',
          houseNo: addr.houseNo,
          city: addr.city,
          district: addr.district,
          state: addr.state,
          country: addr.country,
          zipCode: addr.zipCode || addr.pincode || '',
          pincode: addr.pincode,
          tag: addr.tag || 'other',
        }),
      );
    }

    if (dto.avatar !== undefined) {
      // update user avatar
      await this.userRepo.update(user.id, { avatar: dto.avatar });
    }

    if ((dto as any).name !== undefined) {
      // update user name
      await this.userRepo.update(user.id, { name: (dto as any).name });
    }

    if (profile) await this.expertRepository.save(profile);

    // Notify of status change if is_available was updated
    if (dto.is_available !== undefined) {
      this.expertGateway.notifyStatusChange(user.id, dto.is_available);
    }

    return this.getProfile(user);
  }

  async updateStatus(user: User, isAvailable: boolean) {
    this.logger.log(`Updating status for expert ${user.id} to ${isAvailable}`);
    const profile = await this.expertRepository.findByUserId(user.id);

    if (!profile) {
      this.logger.warn(
        `Failed to update status: Profile not found for user ${user.id}`,
      );
      throw new BadRequestException(
        'Please complete your profile details first before going online.',
      );
    }

    if (isAvailable === false) {
      // Prevent going offline if there are active sessions
      const activeSession = await this.sessionRepo.findOne({
        where: { expertId: profile.id, status: ChatSessionStatus.ACTIVE },
      });
      if (activeSession) {
        throw new BadRequestException(
          'You cannot go offline while you have an active chat session. Please end the session first.',
        );
      }
    }

    profile.is_available = isAvailable;
    await this.expertRepository.save(profile);

    // Notify of status change
    this.expertGateway.notifyStatusChange(user.id, isAvailable);

    return { is_available: isAvailable };
  }

  // async addDocument(user: User, documentUrl: string) {
  //   const profile = await this.profileRepo.findOne({
  //     where: { user: { id: user.id } },
  //   });

  //   if (!profile) {
  //     throw new NotFoundException('Expert profile not found');
  //   }

  //   if (!profile.documents) {
  //     profile.documents = [];
  //   }

  //   // Append new document URL
  //   // profile.documents.push(documentUrl);

  //   await this.profileRepo.save(profile);
  //   return profile;
  // }

  async listExperts(query: QueryExpertDto) {
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    try {
      // Apply pagination
      const [experts, total] = await this.expertRepository.listExperts(query);

      // Map response
      const mapped = experts.map((ex) => {
        const plain = { ...ex } as any;
        plain.languages = ex.languages
          ? ex.languages
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          : [];
        plain.userId = ex.user?.id;
        plain.isAvailable = ex.is_available;
        plain.is_online = ex.user?.id
          ? this.expertGateway.isExpertOnline(ex.user.id)
          : false;
        plain.total_likes = (ex as any).total_likes || 0;
        plain.custom_services = ex.custom_services || [];
        return plain;
      });

      return {
        data: mapped,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to list experts: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Failed to load experts: ${error.message}`);
    }
  }

  async getExpertById(id: number) {
    const expert = await this.expertRepository.getExpertDetails(id);

    if (!expert) {
      throw new NotFoundException('Expert profile not found');
    }

    // convert stored CSV languages -> string[] for API consumers
    const plain = { ...expert } as any;
    plain.languages = expert.languages
      ? expert.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      : [];
    plain.userId = expert.user?.id;
    plain.isAvailable = expert.is_available;
    plain.is_online = expert.user?.id
      ? this.expertGateway.isExpertOnline(expert.user.id)
      : false;
    plain.total_likes = (expert as any).total_likes || 0;
    plain.custom_services = expert.custom_services || [];

    return plain;
  }

  async updateKycStatus(expertId: number, status: string, reason?: string) {
    const user = await this.userRepo.findOne({
      where: { id: Number(expertId) },
      relations: ['profile_expert'],
    });

    if (!user || !user.profile_expert) {
      throw new NotFoundException('Expert profile not found for this user');
    }

    const profile = user.profile_expert;

    // If rejected, do NOT set status to rejected in DB. Reset to pending.
    if (status === 'rejected') {
      profile.kycStatus = 'pending';
    } else {
      profile.kycStatus = status;
    }

    profile.rejectionReason = reason || null;

    if (status === 'approved') {
      await this.userRepo.update(user.id, { emailVerified: true });
    }

    const savedProfile = await this.expertRepository.save(profile);

    // Notify expert via socket
    this.expertGateway.notifyKycStatusUpdate(user.id, status, reason);

    // If rejected, send email
    if (status === 'rejected') {
      const subject = 'Action Required: Update Your Profile - Astrology in Bharat';
      const text = `Hello ${user.name},\n\nYour profile verification was not successful.\nReason: ${reason || 'Details not provided.'}\n\nPlease update your profile and resubmit.`;
      const html = `
        <h3>Hello ${user.name},</h3>
        <p>Your profile verification was not successful.</p>
        <p><strong>Reason:</strong> ${reason || 'Details not provided.'}</p>
        <p>Please log in to your dashboard to make the necessary changes and resubmit your profile for verification.</p>
        <p>Best Regards,<br/>Astrology in Bharat Team</p>
      `;

      try {
        await this.mailService.sendMail(user.email, subject, text, html);
      } catch (error) {
        this.logger.error(
          `Failed to send rejection email to ${user.email}`,
          error.stack,
        );
      }
    }

    return savedProfile;
  }

  async getTopRatedExperts(limit: number = 3) {
    const experts = await this.expertRepository.findTopRated(limit);

    return experts.map((ex) => {
      const plain = { ...ex } as any;
      plain.languages = ex.languages
        ? ex.languages
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
        : [];
      plain.userId = ex.user?.id;
      plain.isAvailable = ex.is_available;
      plain.is_online = ex.user?.id
        ? this.expertGateway.isExpertOnline(ex.user.id)
        : false;
      return plain;
    });
  }
}


