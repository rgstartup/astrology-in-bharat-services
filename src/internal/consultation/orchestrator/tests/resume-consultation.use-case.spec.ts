import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeConsultationUseCase } from '../use-cases/resume-consultation.use-case';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';

const consultationRow = {
  id: 5,
  mode: 'voice',
  status: ConsultationStatus.ACTIVE,
};

const makeDb = (activeSessions: any[] = []) => {
  const values = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([consultationRow]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(activeSessions),
          }),
        }),
      }),
    insert: vi.fn().mockReturnValue({ values }),
  };
  return { db, values };
};

const makeServer = () => {
  const emit = vi.fn();
  return { server: { to: vi.fn().mockReturnValue({ emit }) } as any, emit };
};

const adapters = () => ({
  voice: { onResume: vi.fn().mockResolvedValue(undefined) } as any,
  chat: { onResume: vi.fn().mockResolvedValue(undefined) } as any,
  video: { onResume: vi.fn().mockResolvedValue(undefined) } as any,
});

const budget = (remainingSeconds = 300) =>
  ({
    calculateAffordability: vi.fn().mockResolvedValue({
      elapsedSeconds: 120,
      maxMinutes: 10,
      ratePerMinute: 30,
      remainingSeconds,
    }),
  }) as any;

const rooms = () =>
  ({
    isBillingHeld: vi.fn().mockResolvedValue(false),
    clearBillingHold: vi.fn().mockResolvedValue(undefined),
  }) as any;

describe('ResumeConsultationUseCase session split', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens a new active session for the same mode on resume', async () => {
    const { server, emit } = makeServer();
    const { db, values } = makeDb([]);
    const a = adapters();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      a.chat,
      a.voice,
      a.video,
    );

    const result = await useCase.execute(server, {
      consultationId: 5,
      actorId: 1,
      actorType: 'client',
    });

    expect(result.state).toBe('active');
    expect(values).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        consultation_id: 5,
        mode: 'voice',
        status: ConsultationSessionStatus.ACTIVE,
        started_at: expect.any(Date),
      }),
    );
    expect(a.voice.onResume).toHaveBeenCalledWith(5, {
      anchorIso: expect.any(String),
      baseSeconds: 120,
    });
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate the session when one is already active', async () => {
    const { server } = makeServer();
    const { db, values } = makeDb([{ id: 42 }]);
    const a = adapters();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      a.chat,
      a.voice,
      a.video,
    );

    await useCase.execute(server, {
      consultationId: 5,
      actorId: 1,
      actorType: 'client',
    });

    expect(values).not.toHaveBeenCalled();
  });

  it('rejects a resume with no remaining balance before touching sessions', async () => {
    const { server } = makeServer();
    const { db, values } = makeDb([]);
    const a = adapters();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(0),
      rooms(),
      a.chat,
      a.voice,
      a.video,
    );

    await expect(
      useCase.execute(server, {
        consultationId: 5,
        actorId: 1,
        actorType: 'client',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(values).not.toHaveBeenCalled();
  });
});
