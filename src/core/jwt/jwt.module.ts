import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '../config/auth.config';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const jwtConfig = config.get<AuthConfig>('auth');

        if (!jwtConfig) {
          throw new Error('JWT config not found');
        }

        return {
          secret: jwtConfig?.jwtSecret,
          signOptions: { expiresIn: jwtConfig?.jwtExpiresIn as any },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestJwtModule],
})
export class JwtModule {}
