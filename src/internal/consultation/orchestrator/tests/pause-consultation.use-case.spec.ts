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

describe('PauseConsultationUseCase terminal guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no-ops on terminal consultations (no pause key, no emit)', async () => {
    const { server, emit } = makeServer();
    const a = adapters();
    const useCase = new PauseConsultationUseCase(
      makeDb([{ id: 7, mode: 'chat', status: ConsultationStatus.COMPLETED }]) as any,
      budget(),
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
    const useCase = new PauseConsultationUseCase(
      makeDb([{ id: 8, mode: 'chat', status: ConsultationStatus.ACTIVE }]) as any,
      budget(),
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
    expect(server.to).toHaveBeenCalledWith('consultation:8');
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('throws when the consultation is missing', async () => {
    const { server } = makeServer();
    const a = adapters();
    const useCase = new PauseConsultationUseCase(
      makeDb([]) as any,
      budget(),
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
