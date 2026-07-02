import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { AuthConfig } from '@/config/auth.config';
import { ConfigService } from '@nestjs/config';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';

@Injectable()
export class TokenCryptoService {
  private config: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    configService: ConfigService,
  ) {
    const configData = configService.getOrThrow<AuthConfig>('auth');
    this.config = configData;
  }

  async createAccessToken<T extends object>(payload: T) {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.config.jwtExpiresIn as any,
    });
  }

  async createRefreshToken() {
    const raw = randomBytes(64).toString('hex');
    const hash = await this.hasher.hash(raw);
    return { raw, hash };
  }

  verifyJwt<T extends object>(token: string) {
    return this.jwtService.verifyAsync<T>(token, {
      clockTolerance: 10,
    });
  }

  signTemporaryToken(payload: object) {
    return this.jwtService.sign(payload, {
      expiresIn: '1h',
    });
  }
}
