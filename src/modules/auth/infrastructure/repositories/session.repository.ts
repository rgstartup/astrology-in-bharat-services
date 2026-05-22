// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { FindOptionsWhere, QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '../entities/session.entity';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class SessionRepository extends BaseService<Session> {
  constructor(
    @InjectRepository(Session)
    private sessionsRepo: Repository<Session>,
  ) {
    super(sessionsRepo);
  }

  storeRefreshToken(data: Partial<Session>, queryRunner?: QueryRunner) {
    const repo = this.getRepo(queryRunner);

    return repo.save(data);
  }

  revoke(userId: number, sessionId?: string, queryRunner?: QueryRunner) {
    const repo = this.getRepo(queryRunner);

    const options: FindOptionsWhere<Session> = {
      user: { id: userId },
    };

    if (sessionId) {
      options.id = sessionId;
    }

    return repo.update(options, { revoked: true });
  }

  findUnRevokedRefreshToken(sessionId: string) {
    return this.sessionsRepo.findOne({
      where: {
        id: sessionId,
        type: 'refresh_token',
        revoked: false,
      },
      relations: {
        user: true,
      },
    });
  }
}
