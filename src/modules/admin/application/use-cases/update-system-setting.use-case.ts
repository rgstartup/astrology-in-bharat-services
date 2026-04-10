import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../infrastructure/persistence/entities/system-setting.entity';

@Injectable()
export class UpdateSystemSettingUseCase {
    constructor(
        @InjectRepository(SystemSetting)
        private readonly settingRepo: Repository<SystemSetting>,
    ) { }

    async execute(key: string, value: string, description?: string) {
        let setting = await this.settingRepo.findOne({ where: { key } });

        if (setting) {
            setting.value = value;
            if (description) setting.description = description;
        } else {
            setting = this.settingRepo.create({ key, value, description });
        }

        return this.settingRepo.save(setting);
    }
}
