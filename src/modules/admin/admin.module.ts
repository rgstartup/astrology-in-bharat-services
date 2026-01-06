import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { AdminController } from './admin.controller';
import { UsersModule } from '@/modules/users/users.module';

@Module({
    imports: [ProfileModule, UsersModule],
    controllers: [AdminController],
})
export class AdminModule { }
