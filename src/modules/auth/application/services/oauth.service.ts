import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { OAuthUserDto } from '../dtos/oauth-user.dto';
import { UsersService } from '@/modules/users';
import { User } from '@/modules/users';
import { IOAuthAccountRepository } from '../../domain/repositories/oauth-account.repository.interface';
import { OAuthAccount } from '../../domain/entities/oauth-accounts.entity';

@Injectable()
export class OAuthService {
  constructor(
    @Inject(IOAuthAccountRepository)
    private readonly oauthRepo: IOAuthAccountRepository,
    private usersService: UsersService,
  ) { }

  async findByProvider(provider: string, providerId: string) {
    return this.oauthRepo.findOne({
      where: { provider, providerId },
      relations: ['user', 'user.roles'],
    });
  }

  private async linkAccount(
    data: Partial<OAuthAccount>,
    transactionalRepo?: IOAuthAccountRepository,
  ) {
    const repo = transactionalRepo || this.oauthRepo;
    const account = repo.create(data);
    return repo.save(account);
  }

  // oauth.service.ts
  async findOrCreateUserFromOAuth(
    dto: OAuthUserDto,
    transactionalRepo?: IOAuthAccountRepository,
  ): Promise<User> {
    const oauth = await this.findByProvider(dto.provider, dto.providerId);
    let user: User | null = oauth?.user || null;

    if (!user && dto.email) {
      user = await this.usersService.findByEmail(dto.email);
    }

    if (!user) {
      const isEmailVerified = dto.profile?._json?.email_verified ?? false;

      // Note: usersService.create needs to handle its own transactions or be passed a queryRunner
      // For now, I'll assume it's okay as it was before.
      user = await this.usersService.create(
        {
          email: dto.email,
          name: dto.name,
          roles: dto.roles?.map((role) => ({ name: role })),
          emailVerified: isEmailVerified,
          signinBy: 'google',
        }
      );
    } else {
      // 🔹 Check if user needs the requested roles
      const existingRoleNames = user.roles?.map((r) => r.name) || [];

      // If logging in as an expert, they MUST already have the expert role
      if (
        dto.roles?.includes('expert') &&
        !existingRoleNames.includes('expert')
      ) {
        throw new UnauthorizedException(
          'Access denied. You do not have an expert account with this email.',
        );
      }

      // If logging in as an admin, they MUST already have the admin role
      if (
        dto.roles?.includes('admin') &&
        !existingRoleNames.includes('admin')
      ) {
        throw new UnauthorizedException(
          'Access denied. You do not have an admin account with this email.',
        );
      }
    }

    if (!oauth) {
      await this.linkAccount({ ...dto, user }, transactionalRepo);
    }

    return user;
  }
}


