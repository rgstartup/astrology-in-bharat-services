import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from './entities/profile-client.entity';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from './dto/profile-client.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileClient)
    private repo: Repository<ProfileClient>,
  ) {}

  async findByUserId(user_id: number) {
    return this.repo.findOne({
      where: { user: { id: user_id } },
    });
  }

  async create(user_id: number, dto: CreateProfileClientDto) {
    // prevent duplicate profile
    const exists = await this.findByUserId(user_id);
    if (exists) return exists;

    const profile = this.repo.create({
      ...dto,
      user: { id: user_id },
    });

    return this.repo.save(profile);
  }

  async update(user_id: number, dto: UpdateProfileClientDto) {
    const profile = await this.findByUserId(user_id);
    if (!profile) throw new NotFoundException('Profile not found');

    Object.assign(profile, dto);
    return this.repo.save(profile);
  }
}
