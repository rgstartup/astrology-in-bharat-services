import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from '../../domain/entities/profile-client.entity';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from '../dtos/profile-client.dto';
import { Address, AddressTag } from '@/common/domain/entities/address.entity';

import { User } from '@/modules/users';
import { IClientRepository } from '../../domain/repositories/client.repository.interface';

@Injectable()
export class ClientProfileService {
  constructor(
    @Inject(IClientRepository)
    private repo: IClientRepository,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) { }

  async findByUserId(user_id: number) {
    return this.repo.findByUserId(user_id);
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
      user: { id: user_id } as any,
      addresses: dto.addresses?.map((addr) => {
        // Fix: Ensure we match Address entity structure
        // Combine line1 and line2 if needed as per original update logic, or strictly follow DTO
        // Original create logic passed line2, which likely did nothing if entity lacks it.
        // Safest is to replicate 'lines' combining if that's the intended behavior for Address entity.
        const line1 = [addr.line1, addr.line2].filter(Boolean).join(', ') || addr.line1;

        return {
          id: addr.id,
          line1: line1,
          city: addr.city,
          state: addr.state,
          country: addr.country,
          zipCode: addr.zipCode || '',
          tag: addr.tag || AddressTag.OTHER,
        };
      }) as any[],
    });

    if (dto.profile_picture) {
      await this.userRepo.update(user_id, { avatar: dto.profile_picture });
    }

    await this.repo.save(profile);
    return this.findByUserId(user_id);
  }

  async update(user_id: number, dto: UpdateProfileClientDto) {
    let profile = await this.findByUserId(user_id);

    if (!profile) {
      // If profile doesn't exist (old users), create it on the fly
      profile = this.repo.create({
        user: { id: user_id } as any,
        gender: 'other', // default
      });
      await this.repo.save(profile);
      profile = await this.findByUserId(user_id);
    }

    if (!profile) throw new NotFoundException('Profile could not be created');

    const { full_name, ...profileData } = dto;

    if (full_name) {
      await this.userRepo.update(user_id, { name: full_name });
    }

    // Handle address mapping manually to preserve ID and correct fields
    if (dto.addresses) {
      profile.addresses = dto.addresses.map((addr) => {
        const address = new Address();
        if (addr.id) address.id = addr.id;
        address.line1 = [addr.line1, addr.line2].filter(Boolean).join(', ');
        address.city = addr.city;
        address.state = addr.state;
        address.country = addr.country;
        address.zipCode = addr.zipCode || '';
        address.tag = addr.tag || AddressTag.OTHER;
        return address;
      });
      delete (profileData as any).addresses;
    }

    if (profileData.profile_picture) {
      await this.userRepo.update(user_id, {
        avatar: profileData.profile_picture,
      });
    }

    Object.assign(profile, profileData);

    await this.repo.save(profile);
    return this.findByUserId(user_id);
  }
}


