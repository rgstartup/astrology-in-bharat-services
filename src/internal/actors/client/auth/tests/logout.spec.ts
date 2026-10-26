import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ClientJwtLogoutAuthGuard } from '../guards/logout-auth.guard';
import { ClientLogoutUseCase } from '../use-cases/client-logout.usecase';
import { ConsultationStatus } from '@/internal/consultation/enums';

describe('Client Logout Subsystem', () => {
  describe('ClientJwtLogoutAuthGuard', () => {
    let guard: ClientJwtLogoutAuthGuard;
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
            id: 10,
            user_id: 100,
            email: 'client@example.com',
            is_blocked: false,
          },
        ]),
      };
      guard = new ClientJwtLogoutAuthGuard(mockJwtService, mockDb);
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
        sub: 10,
        email: 'client@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hr ago
      });

      const context = createMockContext({ accessToken: 'expired.jwt.token' });
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('expired.jwt.token', {
        ignoreExpiration: true,
      });
      expect(req.user).toEqual({
        id: 10,
        user_id: 100,
        email: 'client@example.com',
        is_blocked: false,
      });
    });

    it('extracts token from Bearer authorization header if cookie is missing', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 10,
        email: 'client@example.com',
      });

      const context = createMockContext({}, 'Bearer bearer.jwt.token');
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('bearer.jwt.token', {
        ignoreExpiration: true,
      });
      expect(req.user?.id).toBe(10);
    });

    it('permits request even if token is absent (to allow clearing cookies)', async () => {
      const context = createMockContext({});
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('permits request without throwing when token verification fails (corrupt signature)', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid signature'));

      const context = createMockContext({ accessToken: 'corrupted.token' });
      const req = context.switchToHttp().getRequest() as any;

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(req.user).toBeUndefined();
    });
  });

  describe('ClientLogoutUseCase', () => {
    let useCase: ClientLogoutUseCase;
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
      useCase = new ClientLogoutUseCase(mockDb, mockOrchestrator);
    });

    it('revokes sessions by sessionId and userId', async () => {
      await useCase.execute({
        userId: 100,
        sessionId: '0192e2b3-71ef-7000-8000-000000000001',
      });

      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('terminates active consultation when client has one', async () => {
      const selectQuery: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 55 }]),
      };
      mockDb.select.mockReturnValue(selectQuery);

      await useCase.execute({
        userId: 100,
        clientId: 10,
      });

      expect(mockOrchestrator.end).toHaveBeenCalledWith(null, {
        consultationId: 55,
        actorId: 10,
        actorType: 'client',
        reason: 'client_logout',
      });
    });

    it('terminates active consultation with null server leaving broadcast to domain events', async () => {
      const selectQuery: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 55 }]),
      };
      mockDb.select.mockReturnValue(selectQuery);

      await useCase.execute({
        clientId: 10,
      });

      expect(mockOrchestrator.end).toHaveBeenCalledWith(null, {
        consultationId: 55,
        actorId: 10,
        actorType: 'client',
        reason: 'client_logout',
      });
    });

    it('does not call orchestrator when no active consultation exists', async () => {
      await useCase.execute({
        clientId: 10,
      });

      expect(mockOrchestrator.end).not.toHaveBeenCalled();
    });
  });
});
