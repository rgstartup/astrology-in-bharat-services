import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomInt } from 'crypto';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type {
  DrizzleDb,
  DrizzleTx,
} from '../../../../../core/drizzledb/drizzle.types';
import {
  otps,
  users,
  type UserRow,
} from '../../../../../core/drizzledb/schema';
import {
  type IHasher,
  IHasherToken,
} from '../../../../../shared/contracts/hasher.contract';
import { InitiateClientRegisterDto } from '../dto/client-register.dto';
import { and, eq } from 'drizzle-orm';
import { BooleanMessage } from '../../../../../shared/dto/boolean-message.dto';
import { PlatformEnum } from '../../../../users/enums/Platform.enum';
import { RoleEnum } from '../../../../users/enums/Role.enum';
import { OtpPurposeEnum } from '../../../../auth/enums/otp-purpose.enum';

@Injectable()
export class InitiateClientEmailRegistrationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly eventEmitter: EventEmitter2,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(dto: InitiateClientRegisterDto) {
    return this.db.transaction(async (tx) => {
      const existingUser = await this.findClientByEmail(tx, dto.email);

      if (!existingUser) {
        return this.initiateCreateUser(tx, dto);
      }

      if (!existingUser.email_verified_at) {
        const otp = this.generateOtp();
        await this.saveOtp(tx, dto.email, existingUser.id, this.hashOtp(otp));
        this.sendEmail(existingUser, otp);
        return new BooleanMessage(true, 'OTP sent successfully to your email.');
      }

      throw new ConflictException('User is already registered');
    });
  }

  private async findClientByEmail(
    tx: DrizzleTx,
    email: string,
  ): Promise<UserRow | null> {
    const rows = await tx
      .select()
      .from(users)
      .where(
        and(eq(users.email, email), eq(users.platform, PlatformEnum.CLIENT)),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  private async initiateCreateUser(
    tx: DrizzleTx,
    dto: InitiateClientRegisterDto,
  ): Promise<BooleanMessage> {
    const hashedPassword = await this.hasher.hash(dto.password);
    const firstName = dto.first_name.trim();
    const lastName = dto.last_name?.trim() || null;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const [user] = await tx
      .insert(users)
      .values({
        email: dto.email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        name: fullName,
        platform: PlatformEnum.CLIENT,
      })
      .returning({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
      });

    const otp = this.generateOtp();
    await this.saveOtp(tx, dto.email, user.id, this.hashOtp(otp));
    this.sendEmail(user, otp);

    return new BooleanMessage(true, 'OTP sent successfully to your email.');
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async saveOtp(
    tx: DrizzleTx,
    email: string,
    userId: number,
    hashedOtp: string,
  ) {
    // Delete any existing pending registration OTPs for this email
    await tx
      .delete(otps)
      .where(
        and(
          eq(otps.email, email),
          eq(otps.purpose, OtpPurposeEnum.REGISTRATION),
        ),
      );

    const [otp] = await tx
      .insert(otps)
      .values({
        email,
        user_id: userId,
        otp: hashedOtp,
        purpose: OtpPurposeEnum.REGISTRATION,
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })
      .returning();

    return otp;
  }

  private sendEmail<T extends Partial<UserRow>>(user: T, otp: string) {
    this.eventEmitter.emit('auth.client.registered', {
      userId: user.id,
      email: user.email,
      name: user.full_name || undefined,
      role: RoleEnum.CLIENT,
      otp,
    });
  }
}
