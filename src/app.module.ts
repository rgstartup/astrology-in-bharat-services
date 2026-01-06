import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { CoreModule } from '@/core/core.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { RolesModule } from '@/modules/role/roles.module';
import { NotificationModule } from '@/notification/notification.module';
import { ClientModule } from '@/modules/client/client.module';
import { ExpertModule } from '@/modules/expert/expert.module';
import { AdminModule } from '@/modules/admin/admin.module';


@Module({
  imports: [
    UsersModule,
    CoreModule,
    AuthModule,
    RolesModule,
    NotificationModule,
    ClientModule,
    ExpertModule,
    AdminModule,

  ],
})

export class AppModule { }
