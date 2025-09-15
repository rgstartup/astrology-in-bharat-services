import { Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule.forRoot(auth), UsersModule],
  providers: [ConfigurationModule],
})
export class AppModule {}
