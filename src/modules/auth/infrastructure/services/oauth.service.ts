import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { OAuthAccount } from '../entities/oauth-accounts.entity';
import { OAuthUserDto } from '@/modules/auth/api/dto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class OAuthService extends BaseService<OAuthAccount> {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly oauthRepo: Repository<OAuthAccount>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async findOrCreateUserFromOAuth(
    dto: OAuthUserDto,
    queryRunner?: QueryRunner,
  ): Promise<User> {
    const oauth = await this.findByProvider(dto.provider, dto.provider_id);

    if (oauth?.user) return oauth.user;

    const userRepo = queryRunner
      ? queryRunner.manager.getRepository(User)
      : this.userRepository;

    let user = dto.email
      ? await userRepo.findOne({ where: { email: dto.email } })
      : null;

    if (!user) {
      const newUser = userRepo.create({
        email: dto.email,
        name: dto.name,
        avatar: (
          dto.profile as { photos?: Array<{ value?: string }> } | undefined
        )?.photos?.[0]?.value,
        roles: dto.roles,
      });
      user = await userRepo.save(newUser);
    }

    user.markEmailAsVerified();
    await userRepo.save({ ...user, email_verified_at: user.email_verified_at });

    await this.linkAccount({ ...dto, user }, queryRunner);
    return user;
  }
}
