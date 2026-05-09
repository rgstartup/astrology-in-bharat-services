import { Injectable } from '@nestjs/common';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';

@Injectable()
export class LogoutUserUseCase {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async execute(userId: number) {
    return this.sessionRepo.revoke(userId);
  }
}
