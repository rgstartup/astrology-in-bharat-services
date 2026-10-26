import { describe, expect, it, vi } from 'vitest';
import { ConsultationMode, ConsultationStatus } from '@/internal/consultation/enums';
import { InitiateConsultationUsecase } from '../initiate-consultation.usecase';
import { ConsultationNotAvailableError } from '@/internal/actors/client/consultation/chat/errors';

const makeRooms = () => ({
  armRoom: vi.fn().mockResolvedValue('OK'),
  getBudget: vi.fn().mockResolvedValue(null),
  setBudget: vi.fn().mockResolvedValue(undefined),
});

const makeEligibility = (price: number) => ({
  execute: vi.fn().mockResolvedValue({
    expertIsAvailable: true,
    chatPrice: price,
    voicePrice: price,
    isEligibleForFree: false,
    freeMinutes: 0,
    minBalanceRequired: 50,
  }),
});

/** db.select chains: (1) client lookup, (2) wallet balance read. */
const makeOuterDb = () => ({
  select: vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 7 }]),
        }),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ balance: 5000 }]),
        }),
      }),
    }),
});

const makeUseCase = (consultationRow: {
  id: number;
  mode: ConsultationMode;
  status: ConsultationStatus;
  client_id: number;
  expert_id: number;
}) => {
  const txUpdateSet = vi
    .fn()
    .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  const tx = {
    select: vi
      .fn()
      // (1) consultation lookup, (2) other-open-modes check
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
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    update: vi.fn().mockReturnValue({ set: txUpdateSet }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 501 }]),
      }),
    }),
  };
  const db = {
    ...makeOuterDb(),
    transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const rooms = makeRooms();
  const useCase = new InitiateConsultationUsecase(
    db as never,
    makeEligibility(25) as never,
    makeEligibility(30) as never,
    rooms as never,
  );
  return { useCase, txUpdateSet, tx };
};

describe('InitiateConsultationUsecase attachSession mode flip', () => {
  it('continuing a completed voice consultation with chat flips the root mode', async () => {
    const { useCase, txUpdateSet } = makeUseCase({
      id: 111,
      mode: ConsultationMode.VOICE,
      status: ConsultationStatus.COMPLETED,
      client_id: 7,
      expert_id: 3,
    });

    const result = await useCase.execute(7, 3, 'chat', 111);

    expect(result.consultationId).toBe(111);
    expect(result.sessionId).toBe(501);
    // mode flip lands in the same transaction as the pending session
    expect(txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ mode: ConsultationMode.CHAT }),
    );
  });

  it('an open voice consultation still refuses a chat attach', async () => {
    const { useCase, txUpdateSet } = makeUseCase({
      id: 111,
      mode: ConsultationMode.VOICE,
      status: ConsultationStatus.ACTIVE,
      client_id: 7,
      expert_id: 3,
    });

    await expect(useCase.execute(7, 3, 'chat', 111)).rejects.toBeInstanceOf(
      ConsultationNotAvailableError,
    );
    expect(txUpdateSet).not.toHaveBeenCalled();
  });

  it('a closed consultation accepts no fresh sessions at all', async () => {
    const { useCase, tx } = makeUseCase({
      id: 111,
      mode: ConsultationMode.VOICE,
      status: ConsultationStatus.CLOSED,
      client_id: 7,
      expert_id: 3,
    });

    await expect(useCase.execute(7, 3, 'voice', 111)).rejects.toBeInstanceOf(
      ConsultationNotAvailableError,
    );
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
