import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from './entities/profile-client.entity';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from './dto/profile-client.dto';
import { Address } from '@/common/entities/address.entity';

import { User } from '@/users/entities/user.entity';
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
        line1: [addr.line1, addr.line2].filter(Boolean).join(', '),
        city: addr.city,
        state: addr.state,
        country: addr.country,
        zipCode: addr.zipCode,
        // map other fields if necessary
      })),
    });

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

    Object.assign(profile, profileData);

    // Handle address mapping manually to preserve line2
    if (dto.addresses) {
      profile.addresses = dto.addresses.map(
        (addr) =>
          ({
            line1: [addr.line1, addr.line2].filter(Boolean).join(', '),
            city: addr.city,
            state: addr.state,
            country: addr.country,
            zipCode: addr.zipCode,
          }) as any,
      ); // cast to any or Address if import available
    }

    await this.repo.save(profile);
    return this.findByUserId(user_id);
  }
}
