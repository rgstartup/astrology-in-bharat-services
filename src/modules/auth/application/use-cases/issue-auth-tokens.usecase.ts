import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { SessionRepository } from '../../infrastructure/persistence/repositories/session.repository';

@Injectable()
export class IssueAuthTokensUseCase {
  constructor(
    private readonly tokenCrypto: TokenCryptoService,
    private readonly sessionRepo: SessionRepository,
  ) { }

  async execute(
    user: User,
    ip?: string,
    ua?: string,
    queryRunner?: QueryRunner,
  ) {
    const rolesMap: Record<string, string> = {
      client: 'user',
      expert: 'expert',
      admin: 'admin',
    };
    
    // Prioritize admin > expert > client
    const roleNames = user.roles?.map((r) => r.name) || ['client'];
    let primaryRole = 'client';
    if (roleNames.includes('admin')) {
      primaryRole = 'admin';
    } else if (roleNames.includes('expert')) {
      primaryRole = 'expert';
    }

    const accessToken = await this.tokenCrypto.createAccessToken({
      userId: user.id,
      role: rolesMap[primaryRole] || primaryRole,
    });

    const { raw, hash } = await this.tokenCrypto.createRefreshToken();

    const savedSession = await this.sessionRepo.storeRefreshToken(
      {
        user,
        ip_address: ip,
        user_agent: ua,
        type: 'refresh_token',
        secret_hash: hash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      queryRunner,
    );

    return { accessToken, refreshToken: `${savedSession.id}.${raw}` };
  }
}
