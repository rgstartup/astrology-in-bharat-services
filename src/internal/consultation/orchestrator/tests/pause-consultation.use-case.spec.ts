import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PauseConsultationUseCase } from '../use-cases/pause-consultation.use-case';
import { ConsultationStatus } from '@/internal/consultation/enums';

const makeDb = (rows: any[]) => ({
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
});

const makeServer = () => {
  const emit = vi.fn();
  return { server: { to: vi.fn().mockReturnValue({ emit }) } as any, emit };
};

const adapters = () => ({
  chat: { onPause: vi.fn().mockResolvedValue(undefined) } as any,
  voice: { onPause: vi.fn().mockResolvedValue(undefined) } as any,
  video: { onPause: vi.fn().mockResolvedValue(undefined) } as any,
});

const budget = () =>
  ({
    calculateAffordability: vi.fn().mockResolvedValue({
      elapsedSeconds: 60,
      ratePerMinute: 30,
      maxMinutes: 10,
      startedAt: null,
    }),
  }) as any;

const rooms = () =>
  ({
    holdBilling: vi.fn().mockResolvedValue(undefined),
    clearBillingHold: vi.fn().mockResolvedValue(1),
    isBillingHeld: vi.fn().mockResolvedValue(false),
  }) as any;

describe('PauseConsultationUseCase terminal guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no-ops on terminal consultations (no pause key, no emit)', async () => {
    const { server, emit } = makeServer();
    const a = adapters();
    const useCase = new PauseConsultationUseCase(
      makeDb([
        { id: 7, mode: 'chat', status: ConsultationStatus.COMPLETED },
      ]) as any,
      budget(),
      rooms(),
      a.chat,
      a.voice,
      a.video,
    );

    const result = await useCase.execute(server, {
      consultationId: 7,
      actorId: 0,
      actorType: 'system',
      reason: 'insufficient_balance',
    });

    expect(result).toBeNull();
    expect(a.chat.onPause).not.toHaveBeenCalled();
    expect(server.to).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('pauses ACCEPTED/ACTIVE consultations as before', async () => {
    const { server, emit } = makeServer();
    const a = adapters();
    const db = makeDb([
      { id: 8, mode: 'chat', status: ConsultationStatus.ACTIVE },
    ]);
    const useCase = new PauseConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      a.chat,
      a.voice,
      a.video,
    );

    const result = await useCase.execute(server, {
      consultationId: 8,
      actorId: 1,
      actorType: 'client',
      reason: 'manual',
    });

    expect(result?.state).toBe('paused');
    expect(a.chat.onPause).toHaveBeenCalledWith(8);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(server.to).toHaveBeenCalledWith('consultation:8');
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('freezes the clock and gates messaging for a dialog hold', async () => {
    const { server } = makeServer();
    const a = adapters();
    const r = rooms();
    const useCase = new PauseConsultationUseCase(
      makeDb([
        { id: 9, mode: 'chat', status: ConsultationStatus.ACTIVE },
      ]) as any,
      budget(),
      r,
      a.chat,
      a.voice,
      a.video,
    );

    const result = await useCase.execute(server, {
      consultationId: 9,
      actorId: 1,
      actorType: 'client',
      reason: 'billing_hold',
    });

    expect(r.holdBilling).toHaveBeenCalledWith(9, 60);
    expect(a.chat.onPause).toHaveBeenCalledWith(9);
    expect(result?.reason).toBe('billing_hold');
    expect(result?.elapsedSeconds).toBe(60);
  });

  it('throws when the consultation is missing', async () => {
    const { server } = makeServer();
    const a = adapters();
    const useCase = new PauseConsultationUseCase(
      makeDb([]) as any,
      budget(),
      rooms(),
      a.chat,
      a.voice,
      a.video,
    );

    await expect(
      useCase.execute(server, {
        consultationId: 404,
        actorId: 1,
        actorType: 'client',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
