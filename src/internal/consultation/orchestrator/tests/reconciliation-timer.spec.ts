import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsultationOrchestratorService } from '../consultation-orchestrator.service';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';

function createServiceFixture(affordability: any = { remainingSeconds: 600, elapsedSeconds: 30, maxMinutes: 10, ratePerMinute: 20 }) {
  const emit = vi.fn();
  const server = { to: vi.fn(() => ({ emit })) } as any;
  const budget = {
    calculateAffordability: vi.fn(async () => affordability),
  };
  const triggerBudgetHoldUseCase = {
    execute: vi.fn(async () => ({ graceDurationSeconds: 300 })),
  };
  const service = new ConsultationOrchestratorService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    triggerBudgetHoldUseCase as any,
    {} as any,
    {} as any,
    budget as any,
  );
  return { service, server, emit, budget, triggerBudgetHoldUseCase };
}

describe('ConsultationOrchestratorService 30s Budget Reconciliation Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits consultation:budget:tick every 30 seconds when armed', async () => {
    const affordability = {
      consultationId: 101,
      mode: 'chat',
      ratePerMinute: 15,
      costPerSecond: 0.25,
      spendableBalance: 150,
      affordableSeconds: 600,
      maxMinutes: 10,
      elapsedSeconds: 30,
      remainingSeconds: 570,
      isEligibleForFree: false,
      freeMinutes: 0,
      startedAt: '2026-11-04T12:00:00.000Z',
    };
    const { service, server, emit, budget } = createServiceFixture(affordability);

    service.armBudgetTimer(server, 101, 'chat');

    // Resolve the initial promise in armBudgetTimer
    await vi.advanceTimersByTimeAsync(0);

    expect(emit).not.toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.BUDGET.TICK,
      expect.anything(),
    );

    // Fast-forward 30 seconds
    await vi.advanceTimersByTimeAsync(30_000);

    expect(budget.calculateAffordability).toHaveBeenCalledWith(101, 'chat');
    expect(server.to).toHaveBeenCalledWith('consultation:101');
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.BUDGET.TICK,
      expect.objectContaining({
        consultationId: 101,
        mode: 'chat',
        remainingSeconds: 570,
        elapsedSeconds: 30,
        maxMinutes: 10,
        ratePerMinute: 15,
      }),
    );

    service.cancelBudgetTimer(101);
  });

  it('stops emitting after cancelBudgetTimer is called', async () => {
    const { service, server, emit } = createServiceFixture();

    service.armBudgetTimer(server, 102, 'voice');
    await vi.advanceTimersByTimeAsync(0);

    // Cancel timer before 30s tick
    service.cancelBudgetTimer(102);

    // Fast-forward 60s
    await vi.advanceTimersByTimeAsync(60_000);

    expect(emit).not.toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.BUDGET.TICK,
      expect.anything(),
    );
  });

  it('triggers budget hold and stops ticking if remaining time drops to 0', async () => {
    const { service, server, emit, budget, triggerBudgetHoldUseCase } = createServiceFixture({
      consultationId: 103,
      mode: 'chat',
      ratePerMinute: 20,
      remainingSeconds: 300,
      elapsedSeconds: 30,
      maxMinutes: 5,
    });

    service.armBudgetTimer(server, 103, 'chat');
    await vi.advanceTimersByTimeAsync(0);

    // Now affordability drops to 0 before tick
    budget.calculateAffordability.mockResolvedValueOnce({
      consultationId: 103,
      mode: 'chat',
      ratePerMinute: 20,
      remainingSeconds: 0,
      elapsedSeconds: 300,
      maxMinutes: 5,
    });

    await vi.advanceTimersByTimeAsync(30_000);

    expect(triggerBudgetHoldUseCase.execute).toHaveBeenCalledWith(server, 103);

    service.cancelBudgetTimer(103);
  });
});
