import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantRegisterDto } from '../../api/dto/merchant-register.dto';
import { RegistrationPolicy } from '../../domain/policies/registration.policy';
import { DatabaseService } from '@/core/database/database.service';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { AuthProfileCreationResolver } from '../strategies/create-profile/auth-profile-creation.resolver';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { IHasherToken, IHasher } from '@/common/contracts/hasher.contract';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MerchantRegisterUserUseCase {
  constructor(
    private readonly db: DatabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken) private readonly hasher: IHasher,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly profileCreationResolver: AuthProfileCreationResolver,
  ) { }

  async execute(dto: MerchantRegisterDto, _ip?: string, _userAgent?: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // 🔐 domain rule
    RegistrationPolicy.ensureEmailIsUnique(existingUser);

    const response = await this.db.transaction(async (queryRunner) => {
      const hashedPassword = await this.hasher.hash(dto.password);

      const roles = dto.roles || [RoleEnum.MERCHANT];

      const newUser = queryRunner.manager.create(User, {
        name: dto.shopName,
        email: dto.email,
        roles: roles,
        password: hashedPassword,
        email_verified_at: undefined,
      });

      const user = await queryRunner.manager.save(User, newUser);

      await this.profileCreationResolver.ensureProfile(user, queryRunner);

      let profile = await queryRunner.manager.findOne(ProfileMerchant, {
        where: { user_id: user.id as unknown as ProfileMerchant['user_id'] },
      });

      if (profile) {
        Object.assign(profile, { shopName: dto.shopName, phone: dto.phone });
        await queryRunner.manager.save(ProfileMerchant, profile);
      } else {
        profile = queryRunner.manager.create(ProfileMerchant, {
          user: { id: user.id },
          user_id: user.id,
          shopName: dto.shopName,
          phone: dto.phone,
        });
        await queryRunner.manager.save(ProfileMerchant, profile);
      }

      this.sendEmail(user);

      return {
        merchant_id: user.id,
        email: user.email,
        status: 'PENDING',
      };
    });

    return response;
  }

  private sendEmail(user: User) {
    const verification_token = this.tokenCrypto.signTemporaryToken({
      userId: user.id,
      email: user.email,
    });

    // 📢 domain event
    this.eventEmitter.emit(
      'auth.user.registered',
      new UserRegisteredEvent(
        user.id,
        user.email,
        user.name || 'user',
        user.role,
        verification_token,
      ),
    );
  }
}
