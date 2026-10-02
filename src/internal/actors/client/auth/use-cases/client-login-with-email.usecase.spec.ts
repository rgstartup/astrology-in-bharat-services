import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientLoginWithEmailUseCase } from './client-login-with-email.usecase';

const user = {
  id: 42,
  email: 'client@example.com',
  password: 'password-hash',
  email_verified_at: new Date('2025-01-01T00:00:00Z'),
  is_blocked: false,
  first_name: 'Client',
  last_name: 'User',
  name: 'Client User',
  full_name: 'Client User',
};

const account = {
  id: 7,
  user_id: user.id,
  email: user.email,
  is_blocked: false,
};

function makeSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ limit, orderBy });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, orderBy, limit };
}

describe('ClientLoginWithEmailUseCase', () => {
  let useCase: ClientLoginWithEmailUseCase;
  let db: any;
  let hasher: { hash: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  let tokenCrypto: {
    createAccessToken: ReturnType<typeof vi.fn>;
    createRefreshToken: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: EventEmitter2;
  let selectResults: unknown[][];
  let selectIndex: number;

  beforeEach(() => {
    selectResults = [];
    selectIndex = 0;
    db = {
      select: vi.fn(() => makeSelectChain(selectResults[selectIndex++] ?? [])),
      delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 99 }]),
        })),
      })),
    };
    hasher = {
      hash: vi.fn().mockResolvedValue('fallback-hash'),
      verify: vi.fn().mockResolvedValue(true),
    };
    tokenCrypto = {
      createAccessToken: vi.fn().mockResolvedValue('access-token'),
      createRefreshToken: vi
        .fn()
        .mockResolvedValue({ raw: 'refresh-raw', hash: 'refresh-hash' }),
    };
    eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    useCase = new ClientLoginWithEmailUseCase(
      db,
      tokenCrypto as any,
      eventEmitter,
      hasher,
    );
  });

  it('creates tokens and a session for a verified user with a valid password', async () => {
    selectResults = [[user], [account]];

    await expect(
      useCase.execute({ email: user.email, password: 'correct-password' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: '99.refresh-raw',
    });
    expect(hasher.verify).toHaveBeenCalledWith(
      user.password,
      'correct-password',
    );
    expect(db.insert).toHaveBeenCalledTimes(1); // session
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials before checking email verification', async () => {
    hasher.verify.mockResolvedValue(false);
    selectResults = [[user]];

    await expect(
      useCase.execute({ email: user.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('sends a verification OTP and message when an unverified user omits OTP', async () => {
    selectResults = [[{ ...user, email_verified_at: null }]];

    await expect(
      useCase.execute({ email: user.email, password: 'correct-password' }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      message:
        'Please verify your email first. A new OTP has been sent to your email.',
    });
    expect(db.insert).toHaveBeenCalledTimes(1); // OTP
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'auth.client.registered',
      expect.objectContaining({ userId: user.id, email: user.email, otp: expect.any(String) }),
    );
  });

  it('verifies a supplied OTP, marks the email verified, and logs the user in', async () => {
    const inputOtp = '123456';
    const otp = {
      id: 12,
      email: user.email,
      otp: createHash('sha256').update(inputOtp).digest('hex'),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
    };
    selectResults = [[{ ...user, email_verified_at: null }], [otp], [account]];

    await expect(
      useCase.execute({ email: user.email, password: 'correct-password', otp: inputOtp }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: '99.refresh-raw',
    });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('increments failed OTP attempts and rejects an invalid OTP', async () => {
    const otp = {
      id: 12,
      email: user.email,
      otp: createHash('sha256').update('654321').digest('hex'),
      attempts: 1,
      expires_at: new Date(Date.now() + 60_000),
    };
    selectResults = [[{ ...user, email_verified_at: null }], [otp]];

    await expect(
      useCase.execute({ email: user.email, password: 'correct-password', otp: '123456' }),
    ).rejects.toMatchObject({ message: 'Invalid OTP' });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
