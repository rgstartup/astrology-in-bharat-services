import { Setting } from '../entities/setting.entity';

export const ISettingRepository = Symbol('ISettingRepository');

export interface ISettingRepository {
    findByKey(key: string): Promise<Setting | null>;
    save(setting: Setting): Promise<Setting>;
    findByKeys(keys: string[]): Promise<Setting[]>;
    saveMany(settings: Setting[]): Promise<Setting[]>;
}
