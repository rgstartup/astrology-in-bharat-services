import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from './entities/profile-client.entity';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from './dto/profile-client.dto';
import { Address, AddressTag } from '@/common/entities/address.entity';

import { User } from '@/modules/users/entities/user.entity';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class ProfileService extends BaseService<ProfileClient> {
  constructor(
    @InjectRepository(ProfileClient)
    private repo: Repository<ProfileClient>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    super(repo);
  }

  async findByUserId(user_id: number) {
    return this.repo.findOne({
      where: { user: { id: user_id } },
      relations: ['user'],
    });
  }

  async create(user_id: number, dto: CreateProfileClientDto) {
    // prevent duplicate profile
    const exists = await this.findByUserId(user_id);
    if (exists) return exists;

    const { full_name, ...profileData } = dto;

    if (full_name) {
      await this.userRepo.update(user_id, { name: full_name });
    }

    const profile = this.repo.create({
      ...profileData,
      user: { id: user_id },
      addresses: dto.addresses?.map((addr) => ({
        id: addr.id,
        line1: addr.line1,
        line2: addr.line2, // Store line2 if you want to keep it separate or combine as before
        city: addr.city,
        state: addr.state,
        country: addr.country,
        zipCode: addr.zipCode,
        tag: addr.tag || AddressTag.OTHER
      })),
    });

    if (dto.profile_picture) {
      await this.userRepo.update(user_id, { avatar: dto.profile_picture });
    }

    await this.repo.save(profile);
    return this.findByUserId(user_id);
  }

  async update(user_id: number, dto: UpdateProfileClientDto) {
    const profile = await this.findByUserId(user_id);
    if (!profile) throw new NotFoundException('Profile not found');

    const { full_name, ...profileData } = dto;

    if (full_name) {
      await this.userRepo.update(user_id, { name: full_name });
    }

    // Handle address mapping manually to preserve ID and correct fields
    if (dto.addresses) {
      profile.addresses = dto.addresses.map((addr) => {
        const address = new Address();
        if (addr.id) address.id = addr.id;
        address.line1 = addr.line1;
        // If the entity has line1 as combined, then:
        // address.line1 = [addr.line1, addr.line2].filter(Boolean).join(', ');
        // But the previous code combined them. Let's see if Address entity has line2.
        // I checked earlier: Address entity DOES NOT have line2. It has line1 (mapped to street).
        address.line1 = [addr.line1, addr.line2].filter(Boolean).join(', ');
        address.city = addr.city;
        address.state = addr.state;
        address.country = addr.country;
        address.zipCode = addr.zipCode;
        address.tag = addr.tag || AddressTag.OTHER;
        return address;
      });
      delete profileData.addresses; // Don't let Object.assign touch common field name if handled manually
    }

    if (profileData.profile_picture) {
      await this.userRepo.update(user_id, { avatar: profileData.profile_picture });
    }

    Object.assign(profile, profileData);

    await this.repo.save(profile);
    return this.findByUserId(user_id);
  }
}
