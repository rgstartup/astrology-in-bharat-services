import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './domain/entities/setting.entity';
import { SettingsService } from './application/services/settings.service';
import { SettingsController } from './interfaces/controllers/settings.controller';
import { AdminSettingsController } from './interfaces/controllers/admin-settings.controller';
import { ISettingRepository } from './domain/repositories/setting.repository.interface';
import { TypeOrmSettingRepository } from './infrastructure/persistence/typeorm-setting.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Setting])],
    controllers: [SettingsController, AdminSettingsController],
    providers: [
        SettingsService,
        {
            provide: ISettingRepository,
            useClass: TypeOrmSettingRepository,
        },
    ],
    exports: [SettingsService],
})
export class SettingsModule { }
