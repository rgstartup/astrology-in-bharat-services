import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../api/dto';
import { AuthPolicy } from '../../domain/policies/auth.policy';
import { AuthTokenService } from '../services/auth-token.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class LoginWithEmailUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authTokenService: AuthTokenService,
    private readonly authPolicy: AuthPolicy,
  ) {}

  async execute(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'name', 'roles', 'email_verified_at'],
    });

    const isValidPassword = await this.authPolicy.verifyPassword(user, dto.password);

    if (!user || !user.password || !isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.authPolicy.ensureEmailVerified(user);
    this.authPolicy.ensureHasRequiredRole(user, dto.requiredRole);

    const tokens = await this.authTokenService.issueAuthTokens(
      user,
      dto.requiredRole,
      ip,
      userAgent,
    );

    return { user, tokens };
  }
}
