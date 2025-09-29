import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { UsersModule } from './users/users.module';
import { ClientModule } from './client/client.module';
import { CoreModule } from './core/core.module';
import { ExpertModule } from './expert/expert.module';

@Module({
  imports: [
    AuthModule.forRoot(auth),
    UsersModule,
    ClientModule,
    CoreModule,
    ExpertModule,
  ],
})
export class AppModule {}
