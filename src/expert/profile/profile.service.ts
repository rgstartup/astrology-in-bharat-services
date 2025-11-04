import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
    const exists = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (exists) {
      throw new BadRequestException('Expert profile already exists');
    }

    const profile = this.profileRepo.create({
      ...dto,
      user: { id: user.id },
      addresses:
        dto.addresses?.map((addr) => this.addressRepo.create(addr)) ?? [],
    });

    return this.profileRepo.save(profile);
  }

  async updateProfile(user: IUser, dto: UpdateProfileExpertDto) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) throw new NotFoundException('Expert profile not found');

    Object.assign(profile, dto);

    if (dto.addresses) {
      profile.addresses = dto.addresses.map((addr) =>
        this.addressRepo.create(addr),
      );
    }

    return this.profileRepo.save(profile);
  }
}
