import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '@/core/database/database.service';
import { QueryRunner } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import {
  Otp,
  OtpPurposeEnum,
} from '@/modules/auth/infrastructure/entities/otp.entity';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { InitiateClientRegisterDto } from '../dto/client-register.dto';
import { randomInt, createHash } from 'crypto';

@Injectable()
export class InitiateClientEmailRegistrationUseCase {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: InitiateClientRegisterDto) {
    return this.db.transaction(async (queryRunner) => {
      const existingUser = await this.findClientByEmail(queryRunner, dto.email);

      if (existingUser?.isVerified()) {
        throw new ConflictException('User is already registered');
      }

      const hashedPassword = await this.hasher.hash(dto.password);
      const firstName = dto.first_name.trim();
      const lastName = dto.last_name?.trim() || null;
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      let user: User;
      if (existingUser) {
        existingUser.password = hashedPassword;
        existingUser.first_name = firstName;
        existingUser.last_name = lastName;
        existingUser.full_name = fullName;
        existingUser.name = fullName;
        user = await queryRunner.manager.save(User, existingUser);
      } else {
        user = await this.createUser(queryRunner, {
          email: dto.email,
          password: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          name: fullName,
        });
      }

      const otp = this.generateOtp();
      const hashedOtp = this.hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.saveOtp(queryRunner, dto.email, user, hashedOtp, expiresAt);
      this.sendEmail(user, otp);

      return { message: 'OTP sent successfully to your email.' };
    });
  }

  private async findClientByEmail(
    qr: QueryRunner,
    email: string,
  ): Promise<User | null> {
    const userRepo = qr.manager.getRepository(User);

    return userRepo.findOne({
      where: { email, platform: PlatformEnum.CLIENT },
    });
  }

  private async createUser(
    qr: QueryRunner,
    data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string | null;
      full_name: string;
      name: string;
    },
  ) {
    const newUser = qr.manager.create(User, {
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: data.full_name,
      name: data.name,
      platform: PlatformEnum.CLIENT,
    });

    return qr.manager.save(User, newUser);
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async saveOtp(
    qr: QueryRunner,
    email: string,
    user: User,
    hashedOtp: string,
    expiresAt: Date,
  ) {
    const otpRepo = qr.manager.getRepository(Otp);

    // Delete any existing pending registration OTPs for this email
    await otpRepo.delete({ email, purpose: OtpPurposeEnum.REGISTRATION });

    const newOtp = otpRepo.create({
      email,
      user,
      otp: hashedOtp,
      purpose: OtpPurposeEnum.REGISTRATION,
      attempts: 0,
      expires_at: expiresAt,
    });

    return otpRepo.save(newOtp);
  }

  private sendEmail(user: User, otp: string) {
    this.eventEmitter.emit('auth.client.registered', {
      userId: user.id,
      email: user.email,
      name: user.full_name || undefined,
      role: 'client',
      otp,
    });
  }
}
