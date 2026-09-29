import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RoleEnum } from '../../users/enums/Role.enum';
import { AuthTokenService } from '../services/auth-token.service';

@Injectable()
export class IssueAuthTokensUseCase {
  constructor(private readonly authTokenService: AuthTokenService) {}

  async execute(
    user: User,
    targetRole?: RoleEnum,
    ip?: string,
    ua?: string,
    queryRunner?: QueryRunner,
  ) {
    return this.authTokenService.issueAuthTokens(
      user,
      targetRole,
      ip,
      ua,
      queryRunner,
    );
  }
}
