import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { IssueAuthTokensUseCase } from './issue-auth-tokens.usecase';
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-token.error';
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { Session } from '../../infrastructure/entities/session.entity';
import { RefreshTokenPolicy } from '../../domain/policies/refresh-token.policy';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly db: DatabaseService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    private readonly sessionRepo: SessionRepository,
    private readonly issueAuthTokens: IssueAuthTokensUseCase,
  ) {}

  async execute(refreshToken: string) {
    const [sessionId, refreshTokenRaw] = refreshToken.split('.');

    if (!sessionId || !refreshTokenRaw) {
      throw new InvalidRefreshTokenError();
    }

    const foundSession =
      await this.sessionRepo.findUnRevokedRefreshToken(sessionId);

    if (!foundSession) {
      throw new InvalidRefreshTokenError();
    }

    RefreshTokenPolicy.ensureSessionIsActive(foundSession.isActive());

    const isValid = await this.hasher.verify(
      foundSession.secret_hash,
      refreshTokenRaw,
    );

    if (!isValid) {
      throw new InvalidRefreshTokenError();
    }

    return this.revokeAndCreateNewAuthTokens(foundSession);
  }

  revokeAndCreateNewAuthTokens(session: Session) {
    return this.db.transaction(async (queryRunner) => {
      await this.sessionRepo.revoke(session.user.id, session.id, queryRunner);
      return this.issueAuthTokens.execute(
        session.user,
        undefined,
        undefined,
        queryRunner,
      );
    });
  }
}
