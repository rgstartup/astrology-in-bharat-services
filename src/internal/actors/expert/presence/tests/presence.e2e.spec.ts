import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenceService } from '../presence.service';
import {
  AvailabilityMode,
  ConsultationState,
  ExpertClientStatus,
} from '@/core/enums';

describe('Presence E2E Lifecycle Flow', () => {
  let service: PresenceService;
  let clientObservedStatuses: Array<{
    expertId: number;
    status: ExpertClientStatus;
  }>;

  const dbState = {
    expertAvailability: new Map<number, AvailabilityMode>(),
  };

  const redisState = {
    connections: new Map<number, Set<string>>(),
    consultation: new Map<number, ConsultationState>(),
    cachedAvailability: new Map<number, AvailabilityMode>(),
    lastStatus: new Map<number, ExpertClientStatus | null>(),
  };

  beforeEach(() => {
    clientObservedStatuses = [];
    dbState.expertAvailability.clear();
    redisState.connections.clear();
    redisState.consultation.clear();
    redisState.cachedAvailability.clear();
    redisState.lastStatus.clear();

    const mockRedisRepo: any = {
      registerConnection: vi
        .fn()
        .mockImplementation(async (expertId: number, connId: string) => {
          if (!redisState.connections.has(expertId)) {
            redisState.connections.set(expertId, new Set());
          }
          const set = redisState.connections.get(expertId)!;
          const wasOnline = set.size > 0;
          set.add(connId);
          return { wasOnline, activeConnections: set.size };
        }),
      refreshHeartbeat: vi.fn().mockResolvedValue(true),
      removeConnection: vi
        .fn()
        .mockImplementation(async (expertId: number, connId: string) => {
          const set = redisState.connections.get(expertId);
          if (set) {
            set.delete(connId);
          }
          return { remainingConnections: set ? set.size : 0 };
        }),
      getRealtimePresence: vi
        .fn()
        .mockImplementation(async (expertId: number) => {
          const set = redisState.connections.get(expertId);
          return set && set.size > 0 ? 'online' : 'offline';
        }),
      setConsultationState: vi
        .fn()
        .mockImplementation(
          async (expertId: number, state: ConsultationState) => {
            redisState.consultation.set(expertId, state);
          },
        ),
      getConsultationState: vi
        .fn()
        .mockImplementation(async (expertId: number) => {
          return redisState.consultation.get(expertId) || 'idle';
        }),
      setCachedAvailability: vi
        .fn()
        .mockImplementation(
          async (expertId: number, mode: AvailabilityMode) => {
            redisState.cachedAvailability.set(expertId, mode);
          },
        ),
      getCachedAvailability: vi
        .fn()
        .mockImplementation(async (expertId: number) => {
          return redisState.cachedAvailability.get(expertId) || null;
        }),
      getLastStatus: vi.fn().mockImplementation(async (expertId: number) => {
        return redisState.lastStatus.get(expertId) || null;
      }),
      setLastStatus: vi
        .fn()
        .mockImplementation(
          async (expertId: number, status: ExpertClientStatus) => {
            redisState.lastStatus.set(expertId, status);
          },
        ),
      publishPresenceChanged: vi
        .fn()
        .mockImplementation(
          async (expertId: number, status: ExpertClientStatus) => {
            clientObservedStatuses.push({ expertId, status });
          },
        ),
    };

    const mockDb: any = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((values: any) => ({
          where: vi.fn().mockImplementation(async () => {
            if (values.availability_mode) {
              dbState.expertAvailability.set(100, values.availability_mode);
            }
          }),
        })),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(async () => {
              const mode = dbState.expertAvailability.get(100) || 'available';
              return [
                {
                  id: 100,
                  availability_mode: mode,
                  is_available: mode === 'available',
                },
              ];
            }),
          }),
        }),
      }),
    };

    const mockRedis: any = { subscribe: vi.fn() };
    const mockEvents: any = { emit: vi.fn() };

    service = new PresenceService(mockDb, mockRedis, mockRedisRepo, mockEvents);
  });

  it('runs through complete full lifecycle scenario correctly', async () => {
    const expertId = 100;
    const connId = 'socket-desktop-app-1';

    // 1. Initial State: Offline
    expect(await service.getStatus(expertId)).toBe('offline');

    // 2. Expert connects -> Client sees 'online'
    await service.connect(expertId, connId);
    expect(await service.getStatus(expertId)).toBe('online');
    expect(clientObservedStatuses[clientObservedStatuses.length - 1]).toEqual({
      expertId,
      status: 'online',
    });

    // 3. Expert becomes unavailable -> Client sees 'offline'
    await service.setAvailability(expertId, AvailabilityMode.UNAVAILABLE);
    expect(await service.getStatus(expertId)).toBe('offline');
    expect(clientObservedStatuses[clientObservedStatuses.length - 1]).toEqual({
      expertId,
      status: 'offline',
    });

    // 4. Expert becomes available -> Client sees 'online'
    await service.setAvailability(expertId, AvailabilityMode.AVAILABLE);
    expect(await service.getStatus(expertId)).toBe('online');
    expect(clientObservedStatuses[clientObservedStatuses.length - 1]).toEqual({
      expertId,
      status: 'online',
    });

    // 5. Consultation starts -> Client sees 'busy'
    await service.setBusy(expertId, 'consultation-456');
    expect(await service.getStatus(expertId)).toBe('busy');
    expect(clientObservedStatuses[clientObservedStatuses.length - 1]).toEqual({
      expertId,
      status: 'busy',
    });

    // 6. Consultation ends -> Client sees 'online'
    await service.setIdle(expertId, 'consultation-456');
    expect(await service.getStatus(expertId)).toBe('online');
    expect(clientObservedStatuses[clientObservedStatuses.length - 1]).toEqual({
      expertId,
      status: 'online',
    });

    // 7. Expert disconnects -> Client sees 'offline'
    await service.disconnect(expertId, connId);
    expect(await service.getStatus(expertId)).toBe('offline');
    expect(clientObservedStatuses[clientObservedStatuses.length - 1]).toEqual({
      expertId,
      status: 'offline',
    });

    // Verify complete sequence of status change events
    const sequence = clientObservedStatuses.map((s) => s.status);
    expect(sequence).toEqual([
      'online',
      'offline',
      'online',
      'busy',
      'online',
      'offline',
    ]);
  });
});
