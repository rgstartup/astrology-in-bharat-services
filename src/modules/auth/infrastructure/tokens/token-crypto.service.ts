import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { Argon2PasswordHasher } from '../hashing/argon2-password.hasher';
import { AuthConfig } from '@/config/auth.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenCryptoService {
  private config: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly hasher: Argon2PasswordHasher,
    configService: ConfigService,
  ) {
    const configData = configService.getOrThrow<AuthConfig>('auth');
    this.config = configData;
  }

  async createAccessToken<T extends Object>(payload: T) {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.config.jwtExpiresIn as any,
    });
  }

  async createRefreshToken() {
    const raw = randomBytes(64).toString('hex');
    const hash = await this.hasher.hash(raw);
    return { raw, hash };
  }

  verifyJwt<T extends Object>(token: string) {
    return this.jwtService.verifyAsync<T>(token, {
      clockTolerance: 10,
    });
  }

  signTemporaryToken(payload: object) {
    return this.jwtService.sign(payload, {
      expiresIn: 5 * 60 * 1000,
    });
  }
}
