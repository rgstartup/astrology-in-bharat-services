import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Setting } from '../../domain/entities/setting.entity';
import { ISettingRepository } from '../../domain/repositories/setting.repository.interface';

@Injectable()
export class TypeOrmSettingRepository implements ISettingRepository {
    constructor(
        @InjectRepository(Setting)
        private readonly repository: Repository<Setting>,
    ) { }

    async findByKey(key: string): Promise<Setting | null> {
        return this.repository.findOne({ where: { key } });
    }

    async save(setting: Setting): Promise<Setting> {
        return this.repository.save(setting);
    }

    async findByKeys(keys: string[]): Promise<Setting[]> {
        return this.repository.find({ where: { key: In(keys) } });
    }

    async saveMany(settings: Setting[]): Promise<Setting[]> {
        return this.repository.save(settings);
    }
}
