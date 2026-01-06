import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProfileAdmin } from './entities/profile-admin.entity';
import {
    CreateProfileAdminDto,
    UpdateProfileAdminDto,
} from './dto/create-profile-admin.dto';
import { User } from '@/modules/users/entities/user.entity';
import { ADMIN_ERRORS } from '@/common/errors/admin.errors';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(ProfileAdmin)
        private readonly profileRepo: Repository<ProfileAdmin>,
    ) { }

    async getProfile(user: User) {
        const profile = await this.profileRepo.findOne({
            where: { user: { id: user.id } },
        });

        if (!profile) throw new NotFoundException(ADMIN_ERRORS.NOT_FOUND);

        return profile;
    }

    async createProfile(user: User, dto: CreateProfileAdminDto) {
        // check if exists already
        const exists = await this.profileRepo.findOne({
            where: { user: { id: user.id } },
        });

        if (exists) {
            throw new BadRequestException(ADMIN_ERRORS.ALREADY_EXISTS);
        }

        const profile = this.profileRepo.create({
            ...dto,
            user: { id: user.id },
        });

        return this.profileRepo.save(profile);
    }

    async updateProfile(user: User, dto: UpdateProfileAdminDto) {
        const profile = await this.profileRepo.findOne({
            where: { user: { id: user.id } },
        });

        if (!profile) throw new NotFoundException(ADMIN_ERRORS.NOT_FOUND);

        Object.assign(profile, dto);

        return this.profileRepo.save(profile);
    }
}
