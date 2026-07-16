import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../infrastructure/entities/system-setting.entity';
import { UpdateSystemSettingDto } from '../../api/dto/update-system-setting.dto';

@Injectable()
export class UpdateSystemSettingUseCase {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async execute(dto: UpdateSystemSettingDto) {
    const { key, value, description } = dto;
    let setting = await this.settingRepo.findOne({ where: { key } });

    if (setting) {
      setting.value = value;
      if (description) setting.description = description;
    } else {
      setting = this.settingRepo.create({ key, value, description });
    }

    await this.settingRepo.save(setting);
    return new BooleanMessage();
  }
}

