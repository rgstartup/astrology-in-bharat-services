import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { StringValue } from 'ms';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { AuthConfig } from '@/config/auth.config';

@Injectable()
export class ExpertTokenCryptoService {
  private readonly config: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<AuthConfig>('auth');
  }

  createAccessToken<T extends object>(payload: T) {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.config.jwtExpiresIn as StringValue,
    });
  }

  async createRefreshToken() {
    const raw = randomBytes(64).toString('hex');
    return { raw, hash: await this.hasher.hash(raw) };
  }

  verifyJwt<T extends object>(token: string) {
    return this.jwtService.verifyAsync<T>(token, { clockTolerance: 10 });
  }

  signTemporaryToken(payload: object) {
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }
}
