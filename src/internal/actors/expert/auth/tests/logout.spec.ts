import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ExpertJwtLogoutAuthGuard } from '../guards/logout-auth.guard';
import { ExpertLogoutUseCase } from '../use-cases/expert-logout.usecase';
import { AvailabilityMode } from '@/core/enums/availability-mode.enum';

describe('Expert Logout Subsystem', () => {
  describe('ExpertJwtLogoutAuthGuard', () => {
    let guard: ExpertJwtLogoutAuthGuard;
    let mockJwtService: any;
    let mockDb: any;

    beforeEach(() => {
      mockJwtService = {
        verifyAsync: vi.fn(),
      };
      mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 25,
            user_id: 250,
            email: 'expert@example.com',
            is_blocked: false,
          },
        ]),
      };
      guard = new ExpertJwtLogoutAuthGuard(mockJwtService, mockDb);
    });

    const createMockContext = (cookies: Record<string, string> = {}, authHeader?: string) => {
      const req: Partial<Request> = {
        cookies,
        headers: {
          authorization: authHeader,
        },
      };
      return {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as unknown as ExecutionContext;
    };

    it('permits request and sets req.user when token is expired but signature is valid', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 25,
        email: 'expert@example.com',
        exp: Math.floor(Date.now() / 1000) - 7200, // expired 2 hrs ago
      });

      const context = createMockContext({ accessToken: 'expired.expert.jwt' });
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('expired.expert.jwt', {
        ignoreExpiration: true,
      });
      expect(req.user).toEqual({
        id: 25,
        user_id: 250,
        email: 'expert@example.com',
        is_blocked: false,
      });
    });

    it('permits request without token so logout can clear cookies', async () => {
      const context = createMockContext({});
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(req.user).toBeUndefined();
    });

    it('permits request on invalid token without throwing 401', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt malformed'));

      const context = createMockContext({ accessToken: 'malformed.token' });
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(req.user).toBeUndefined();
    });
  });

  describe('ExpertLogoutUseCase', () => {
    let useCase: ExpertLogoutUseCase;
    let mockDb: any;
    let mockOrchestrator: any;

    beforeEach(() => {
      const selectQuery: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        select: vi.fn().mockReturnValue(selectQuery),
      };
      mockOrchestrator = {
        end: vi.fn().mockResolvedValue({}),
      };
      useCase = new ExpertLogoutUseCase(mockDb, mockOrchestrator);
    });

    it('revokes sessions and sets availability mode to unavailable', async () => {
      await useCase.execute({
        userId: 250,
        expertId: 25,
        sessionId: '0192e2b3-71ef-7000-8000-000000000002',
      });

      // 1. Session by sessionId
      // 2. Session by userId
      // 3. Expert availability update
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });

    it('terminates active consultation with expert actorType', async () => {
      const selectQuery: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 88 }]),
      };
      mockDb.select.mockReturnValue(selectQuery);

      await useCase.execute({
        expertId: 25,
      });

      expect(mockOrchestrator.end).toHaveBeenCalledWith(null, {
        consultationId: 88,
        actorId: 25,
        actorType: 'expert',
        reason: 'expert_logout',
      });
    });
  });
});
