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
    const session = repo.create(data);
    return repo.save(session);
  }

  revoke(userId: number | string, sessionId?: number | string, queryRunner?: QueryRunner) {
    const repo = this.getRepo(queryRunner);

    const options: FindOptionsWhere<Session> = {
      user: { id: Number(userId) },
    };

    if (sessionId) {
      options.id = Number(sessionId);
    }

    return repo.update(options, { revoked: true });
  }

  findUnRevokedRefreshToken(sessionId: number | string) {
    return this.sessionsRepo.findOne({
      where: {
        id: Number(sessionId),
        type: 'refresh_token',
        revoked: false,
      },
      relations: {
        user: true,
      },
    });
  }
}
