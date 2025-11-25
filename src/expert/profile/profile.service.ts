import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProfileExpert } from './entities/profile-expert.entity';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from './dto/profile-expert.dto';
import { Address } from '@/common/entities/address.entity';
import { IUser } from '@/common/guards/jwt-auth.guard';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,

    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
  ) {}

  async getProfile(user: IUser) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) throw new NotFoundException('Expert profile not found');

    return profile;
  }

  async createProfile(user: IUser, dto: CreateProfileExpertDto) {
    // check if exists already
    try{
        const exists = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });
    console.log('createProfile called — user:', user);
  console.log('createProfile - dto:', dto);

    if (exists) {
      throw new BadRequestException('Expert profile already exists');
    }

    const profile = this.profileRepo.create({
      ...dto,
      user: { id: user.id },
      addresses:
        dto.addresses?.map((addr) =>
          this.addressRepo.create({
            // map DTO -> entity fields
            street: [addr.line1, addr.line2].filter(Boolean).join(', '),
            city: addr.city,
            state: addr.state,
            country: addr.country,
            postal_code: addr.zipCode,
          }),
        ) ?? [],
    });

    return this.profileRepo.save(profile);

    } catch (error) {
       this.logger.error(
        `Failed to create profile for user: `,
        error.stack,
      );
      throw error;
    }
  
  }

  async updateProfile(user: IUser, dto: UpdateProfileExpertDto) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) throw new NotFoundException('Expert profile not found');

    Object.assign(profile, dto);

    if (dto.addresses) {
      profile.addresses = dto.addresses.map((addr) =>
        this.addressRepo.create({
          street: [addr.line1, addr.line2].filter(Boolean).join(', '),
          city: addr.city,
          state: addr.state,
          country: addr.country,
          postal_code: addr.zipCode,
        }),
      );
    }

    return this.profileRepo.save(profile);
  }

  // async fetchAllProfiles() {
  //   return this.profileRepo.find();
  // }
}


