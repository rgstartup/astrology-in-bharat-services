import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestConsultationUseCase } from '../use-cases/request-consultation.use-case';
import { ConsultationStatus } from '@/internal/consultation/enums';

const makeDb = (row: any[]) => {
  const set = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  const db = {
    select: vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(row),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 900 }]),
            }),
          }),
        }),
      }),
    update: vi.fn().mockReturnValue({ set }),
  };
  return { db, set };
};

const makeServer = () => {
  const emit = vi.fn();
  return { server: { to: vi.fn().mockReturnValue({ emit }) } as any, emit };
};

const makeUseCase = (status: ConsultationStatus) => {
  const { server, emit } = makeServer();
  const { db, set } = makeDb([
    { id: 111, mode: 'voice', status, client_id: 7, expert_id: 3 },
  ]);
  const rooms = { armRequestExpiry: vi.fn().mockResolvedValue(undefined) } as any;
  const budget = {
    calculateAffordability: vi.fn().mockResolvedValue({
      maxMinutes: 10,
      ratePerMinute: 30,
      elapsedSeconds: 0,
      startedAt: null,
    }),
  } as any;
  const useCase = new RequestConsultationUseCase(db as any, rooms, budget);
  return { useCase, server, emit, set };
};

describe('RequestConsultationUseCase status guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('re-opens a completed consultation as REOPENED and emits incoming', async () => {
    const { useCase, server, emit, set } = makeUseCase(
      ConsultationStatus.COMPLETED,
    );

    const result = await useCase.execute(server, {
      consultationId: 111,
      actorId: 7,
      actorType: 'client',
      expertId: 3,
    });

    expect(result).toEqual({ status: 'requested', consultationId: 111 });
    // status goes COMPLETED -> REOPENED
    const setArg = set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.status).toBe(ConsultationStatus.REOPENED);
    // incoming reaches both the consultation room and the expert room
    expect(server.to).toHaveBeenCalledWith('consultation:111');
    expect(server.to).toHaveBeenCalledWith('expert:3');
    expect(emit).toHaveBeenCalledTimes(2);
    // incoming payload carries the affordability rate for the accept modal
    const firstPayload = emit.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(firstPayload.ratePerMinute).toBe(30);
  });

  it('re-requests a REOPENED consultation without flipping status', async () => {
    const { useCase, set } = makeUseCase(ConsultationStatus.REOPENED);

    const result = await useCase.execute(makeServer().server, {
      consultationId: 111,
      actorId: 7,
      actorType: 'client',
      expertId: 3,
    });

    expect(result).toEqual({ status: 'requested', consultationId: 111 });
    const setArg = set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg.status).toBeUndefined();
  });

  it('still rejects consultations that cannot be continued', async () => {
    const { useCase, server, emit } = makeUseCase(
      ConsultationStatus.CLOSED,
    );

    await expect(
      useCase.execute(server, {
        consultationId: 111,
        actorId: 7,
        actorType: 'client',
        expertId: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(emit).not.toHaveBeenCalled();
  });
});
