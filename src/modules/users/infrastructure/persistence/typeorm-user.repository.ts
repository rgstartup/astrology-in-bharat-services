import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, MoreThanOrEqual, In } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>,
    ) { }

    create(data: Partial<User>): User {
        return this.repository.create(data);
    }

    async save(user: User): Promise<User> {
        return this.repository.save(user);
    }

    async findOne(options: any): Promise<User | null> {
        return this.repository.findOne(options);
    }

    async findById(id: number, relations: string[] = ['roles', 'oauthAccounts', 'credentials', 'profile_expert', 'profile_client']): Promise<User | null> {
        return this.repository.findOne({
            where: { id } as any,
            relations,
        });
    }

    async findByEmail(email: string, relations: string[] = ['roles']): Promise<User | null> {
        return this.repository.findOne({ where: { email } as any, relations });
    }

    async findByEmailWithPassword(email: string): Promise<User | null> {
        return this.repository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .leftJoinAndSelect('user.roles', 'roles')
            .getOne();
    }

    async findAll(search?: string, page: number = 1, limit: number = 10): Promise<{ data: User[]; total: number }> {
        const skip = (page - 1) * limit;

        const query = this.repository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'roles')
            .leftJoinAndSelect('user.oauthAccounts', 'oauthAccounts')
            .leftJoinAndSelect('user.credentials', 'credentials');

        if (search) {
            query.where(
                '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search))',
                { search: `%${search}%` },
            );
        }

        const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

        return { data, total };
    }

    async count(options?: any): Promise<number> {
        return this.repository.count(options);
    }

    async update(id: number, data: Partial<User>): Promise<void> {
        await this.repository.update(id, data);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    async getUserExpertGrowthStats(days: number): Promise<any[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        return this.repository
            .createQueryBuilder('user')
            .leftJoin('user.roles', 'role')
            .select([
                "TO_CHAR(user.createdAt, 'Mon DD') as date",
                "COUNT(CASE WHEN role.name = 'client' THEN 1 END) as users",
                "COUNT(CASE WHEN role.name = 'expert' THEN 1 END) as astrologers",
            ])
            .where('user.createdAt >= :startDate', { startDate })
            .groupBy("TO_CHAR(user.createdAt, 'Mon DD'), DATE_TRUNC('day', user.createdAt)")
            .orderBy("DATE_TRUNC('day', user.createdAt)", 'ASC')
            .getRawMany();
    }

    async getExpertStats(today: Date): Promise<any> {
        return this.repository
            .createQueryBuilder('user')
            .leftJoin('user.roles', 'role')
            .leftJoin('user.profile_expert', 'profile')
            .where('role.name = :roleName', { roleName: 'expert' })
            .select([
                'COUNT(user.id) as total',
                "COUNT(CASE WHEN LOWER(profile.kycStatus) IN ('approved', 'active') THEN 1 END) as active",
                "COUNT(CASE WHEN LOWER(profile.kycStatus) = 'pending' OR profile.kycStatus IS NULL THEN 1 END) as pending",
                "COUNT(CASE WHEN LOWER(profile.kycStatus) = 'rejected' THEN 1 END) as rejected",
                'COUNT(CASE WHEN user.createdAt >= :today THEN 1 END) as newtoday',
            ])
            .setParameter('today', today)
            .getRawOne();
    }

    async findAllByRole(
        roleName: string,
        search?: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: User[]; total: number }> {
        const skip = (page - 1) * limit;

        const query = this.repository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'roles')
            .where('roles.name = :roleName', { roleName });

        if (roleName === 'client') {
            query
                .leftJoinAndSelect('user.profile_client', 'profile')
                .leftJoinAndSelect('profile.addresses', 'addresses');
        } else if (roleName === 'expert') {
            query
                .leftJoinAndSelect('user.profile_expert', 'profile')
                .leftJoinAndSelect('profile.addresses', 'addresses');
        }

        if (search) {
            query.andWhere(
                '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search))',
                { search: `%${search}%` },
            );
        }

        const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

        return { data, total };
    }

    getRepo(queryRunner?: QueryRunner): Repository<User> {
        if (queryRunner) {
            return queryRunner.manager.getRepository(User);
        }
        return this.repository;
    }
}
