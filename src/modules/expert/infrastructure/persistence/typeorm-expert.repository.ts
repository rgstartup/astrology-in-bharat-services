import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { IExpertRepository } from '../../domain/repositories/expert.repository.interface';

@Injectable()
export class TypeOrmExpertRepository implements IExpertRepository {
    constructor(
        @InjectRepository(ProfileExpert)
        private readonly repository: Repository<ProfileExpert>,
    ) { }

    async findByUserId(userId: number): Promise<ProfileExpert | null> {
        return this.repository.findOne({
            where: { user: { id: userId } },
            relations: ['user', 'addresses'],
        });
    }

    async findById(id: number): Promise<ProfileExpert | null> {
        return this.repository.findOne({
            where: { id },
            relations: ['user', 'addresses'],
        });
    }

    async save(profile: ProfileExpert): Promise<ProfileExpert> {
        return this.repository.save(profile);
    }

    create(data: Partial<ProfileExpert>): ProfileExpert {
        return this.repository.create(data);
    }

    async findTopRated(limit: number): Promise<ProfileExpert[]> {
        return this.repository
            .createQueryBuilder('profile')
            .leftJoinAndSelect('profile.user', 'user')
            .leftJoinAndSelect('profile.addresses', 'addresses')
            .where('LOWER(profile.kycStatus) IN (:...statuses)', { statuses: ['approved', 'active'] })
            .orderBy('profile.rating', 'DESC')
            .take(limit)
            .getMany();
    }

    async listExperts(query: any): Promise<[ProfileExpert[], number]> {
        const limit = query.limit || 20;
        const offset = query.offset || 0;
        const sort = query.sort || 'newest';

        let priceColumn = 'profile.price';
        if (query.service === 'chat') {
            priceColumn = 'profile.chat_price';
        } else if (query.service === 'call') {
            priceColumn = 'profile.call_price';
        } else if (query.service === 'video_call') {
            priceColumn = 'profile.video_call_price';
        }

        const queryBuilder = this.repository
            .createQueryBuilder('profile')
            .leftJoinAndSelect('profile.user', 'user')
            .leftJoinAndSelect('profile.addresses', 'addresses')
            .where('LOWER(profile.kycStatus) IN (:...statuses)', { statuses: ['approved', 'active'] });

        if (query.q && query.q.trim()) {
            queryBuilder.andWhere('user.name ILIKE :name', {
                name: `%${query.q}%`,
            });
        }

        if (query.specializations && query.specializations.trim()) {
            const specs = query.specializations
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

            const specsConditions = specs
                .map((_, idx) => `profile.specialization ILIKE :spec${idx}`)
                .join(' OR ');

            const specParams: any = {};
            specs.forEach((spec, idx) => {
                specParams[`spec${idx}`] = `%${spec}%`;
            });

            queryBuilder.andWhere(`(${specsConditions})`, specParams);
        }

        const rawRating = query.rating || query.minRating;
        const minRating = rawRating ? Number(rawRating) : undefined;
        if (minRating && minRating > 0) {
            queryBuilder.andWhere('profile.rating >= :minRating', {
                minRating: minRating,
            });
        }

        if (query.minPrice !== undefined) {
            queryBuilder.andWhere(`${priceColumn} >= :minPrice`, {
                minPrice: Number(query.minPrice),
            });
        }
        if (query.maxPrice !== undefined) {
            queryBuilder.andWhere(`${priceColumn} <= :maxPrice`, {
                maxPrice: Number(query.maxPrice),
            });
        }

        if (query.minExperience && query.minExperience >= 0) {
            queryBuilder.andWhere('profile.experience_in_years >= :minExperience', {
                minExperience: Number(query.minExperience),
            });
        }

        if (query.location && query.location.trim()) {
            queryBuilder.andWhere('addresses.city ILIKE :location', {
                location: `%${query.location}%`,
            });
        }

        if (query.state && query.state.trim()) {
            queryBuilder.andWhere('addresses.state ILIKE :state', {
                state: `%${query.state}%`,
            });
        }

        const isOnlineFilter =
            query.online === 'true' || query.onlineOnly === 'true';
        if (isOnlineFilter) {
            queryBuilder.andWhere('profile.is_available = :isAvailable', {
                isAvailable: true,
            });
        }

        if (query.languages && query.languages.trim()) {
            const langs = query.languages
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

            const langConditions = langs
                .map((_, idx) => `profile.languages ILIKE :lang${idx}`)
                .join(' OR ');

            const langParams: any = {};
            langs.forEach((lang, idx) => {
                langParams[`lang${idx}`] = `%${lang}%`;
            });

            queryBuilder.andWhere(`(${langConditions})`, langParams);
        }

        if (sort === 'experience') {
            queryBuilder.orderBy('profile.experience_in_years', 'DESC');
        } else if (sort === 'rating') {
            queryBuilder.orderBy('profile.rating', 'DESC');
        } else if (sort === 'name') {
            queryBuilder.orderBy('user.name', 'ASC');
        } else if (sort === 'price_asc') {
            queryBuilder.orderBy(priceColumn, 'ASC');
        } else if (sort === 'price_desc') {
            queryBuilder.orderBy(priceColumn, 'DESC');
        } else if (sort === 'newest') {
            queryBuilder.orderBy('profile.createdAt', 'DESC');
        }

        return queryBuilder
            .skip(offset)
            .take(limit)
            .getManyAndCount();
    }

    async getExpertDetails(id: number): Promise<ProfileExpert | null> {
        return this.repository
            .createQueryBuilder('profile')
            .leftJoinAndSelect('profile.user', 'user')
            .leftJoinAndSelect('profile.addresses', 'addresses')
            .where('profile.id = :id', { id })
            .andWhere('LOWER(profile.kycStatus) IN (\'approved\', \'active\')')
            .getOne();
    }
}
