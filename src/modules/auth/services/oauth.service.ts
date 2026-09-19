import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { OAuthAccount } from '../entities/oauth-accounts.entity';
import { OAuthUserDto } from '@/modules/auth/dto';
import { User } from '@/modules/users/entities/user.entity';
import { BaseService } from '@/common/services/transaction.service';
import { Media } from '@/modules/media/entities/media.entity';
import { MediaSource } from '@/modules/media/enums/media-source.enum';

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
      const avatarUrl =
        dto.oauthProfile?.photos?.[0]?.value || dto.oauthProfile?.profileUrl;
      let avatarMediaId: number | null = null;

      if (avatarUrl && queryRunner) {
        const mediaRepo = queryRunner.manager.getRepository(Media);
        const media = mediaRepo.create({
          url: avatarUrl,
          source: MediaSource.GOOGLE,
          public_id: null,
          mime_type: 'image/jpeg',
          created_at: new Date(),
          updated_at: new Date(),
        });
        const savedMedia = await mediaRepo.save(media);
        avatarMediaId = savedMedia.id;
      }

      const newUser = userRepo.create({
        email: dto.email,
        name: dto.name,
        avatar: avatarUrl,
        avatar_id: avatarMediaId,
        role: dto.role,
      });

      user = await userRepo.save(newUser);
    }

    user.markEmailAsVerified();
    await userRepo.save({ ...user, email_verified_at: user.email_verified_at });

    await this.linkAccount({ ...dto, user }, queryRunner);
    return user;
  }
}
