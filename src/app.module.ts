import { Module } from '@nestjs/common';
// import { AuthModule } from '@thallesp/nestjs-better-auth';
// import { auth } from './lib/auth';
import { UsersModule } from './users/users.module';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './role/roles.module';
import { NotificationModule } from './notification/notification.module';
import { ClientModule } from './client/client.module';
import { ExpertModule } from './expert/expert.module';

@Module({
  imports: [
    UsersModule,
    CoreModule,
    AuthModule,
    RolesModule,
    NotificationModule,
    ClientModule,
    ExpertModule,
  ],
})
export class AppModule {}
