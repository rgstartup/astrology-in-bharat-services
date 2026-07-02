import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../infrastructure/entities/system-setting.entity';

@Injectable()
export class GetSystemSettingsUseCase {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async execute(keys?: string[]) {
    if (keys && keys.length > 0) {
      return this.settingRepo.find({
        where: keys.map((key) => ({ key })),
      });
    }
    return this.settingRepo.find();
  }

  async getOne(key: string, defaultValue?: string): Promise<string> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting ? setting.value : defaultValue || '0';
  }
}
