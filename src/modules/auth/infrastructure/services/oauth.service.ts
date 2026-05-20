import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { OAuthAccount } from '../entities/oauth-accounts.entity';
import { OAuthUserDto } from '@/modules/auth/api/dto';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class OAuthService extends BaseService<OAuthAccount> {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly oauthRepo: Repository<OAuthAccount>,
    private readonly usersFacade: UsersFacade,
  ) {
    super(oauthRepo);
  }

  async findByProvider(provider: string, providerId: string) {
    return this.oauthRepo.findOne({
      where: { provider, provider_id: providerId },
      relations: ['user'],
    });
  }

  private async linkAccount(
    data: Partial<OAuthAccount>,
    queryRunner?: QueryRunner,
  ) {
    const repo = this.getRepo(queryRunner);

    const account = repo.create(data);

    return repo.save(account);
  }

  // oauth.service.ts
  async findOrCreateUserFromOAuth(
    dto: OAuthUserDto,
    queryRunner?: QueryRunner,
  ): Promise<User> {
    let oauth = await this.findByProvider(dto.provider, dto.provider_id);

    if (oauth?.user) return oauth.user;

    let user = dto.email ? await this.usersFacade.findByEmail(dto.email, queryRunner) : null;

    user ??= await this.usersFacade.create(
      {
        email: dto.email,
        name: dto.name,
        avatar: dto.profile?.photos?.[0]?.value,
        roles: dto.roles,
      },
      queryRunner,
    );

    user.markEmailAsVerified();
    await this.usersFacade.update(user.id, { email_verified_at: user.email_verified_at }, queryRunner);

    await this.linkAccount({ ...dto, user }, queryRunner);
    return user;
  }
}
