import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PresenceService } from '../presence.service';
import { PresenceRedisRepository } from '../presence-redis.repository';
import {
  AvailabilityMode,
  ConsultationState,
  RealtimePresence,
} from '@/core/enums';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockDb: any;
  let mockRedis: any;
  let mockRedisRepo: {
    registerConnection: ReturnType<typeof vi.fn>;
    refreshHeartbeat: ReturnType<typeof vi.fn>;
    removeConnection: ReturnType<typeof vi.fn>;
    getRealtimePresence: ReturnType<typeof vi.fn>;
    getBatchRealtimePresence: ReturnType<typeof vi.fn>;
    setConsultationState: ReturnType<typeof vi.fn>;
    getConsultationState: ReturnType<typeof vi.fn>;
    getBatchConsultationStates: ReturnType<typeof vi.fn>;
    setCachedAvailability: ReturnType<typeof vi.fn>;
    getCachedAvailability: ReturnType<typeof vi.fn>;
    getBatchCachedAvailability: ReturnType<typeof vi.fn>;
    getLastStatus: ReturnType<typeof vi.fn>;
    setLastStatus: ReturnType<typeof vi.fn>;
    publishPresenceChanged: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };

  const inMemoryState = {
    connections: new Map<number, Set<string>>(),
    consultation: new Map<number, ConsultationState>(),
    availability: new Map<number, AvailabilityMode>(),
    lastStatus: new Map<number, string | null>(),
  };

  beforeEach(() => {
    inMemoryState.connections.clear();
    inMemoryState.consultation.clear();
    inMemoryState.availability.clear();
    inMemoryState.lastStatus.clear();

    mockRedisRepo = {
      registerConnection: vi
        .fn()
        .mockImplementation(async (expertId: number, connId: string) => {
          if (!inMemoryState.connections.has(expertId)) {
            inMemoryState.connections.set(expertId, new Set());
          }
          const set = inMemoryState.connections.get(expertId)!;
          const wasOnline = set.size > 0;
          set.add(connId);
          return { wasOnline, activeConnections: set.size };
        }),
      refreshHeartbeat: vi.fn().mockResolvedValue(true),
      removeConnection: vi
        .fn()
        .mockImplementation(async (expertId: number, connId: string) => {
          const set = inMemoryState.connections.get(expertId);
          if (set) {
            set.delete(connId);
          }
          return { remainingConnections: set ? set.size : 0 };
        }),
      getRealtimePresence: vi
        .fn()
        .mockImplementation(async (expertId: number) => {
          const set = inMemoryState.connections.get(expertId);
          return set && set.size > 0 ? RealtimePresence.ONLINE : RealtimePresence.OFFLINE;
        }),
      getBatchRealtimePresence: vi
        .fn()
        .mockImplementation(async (expertIds: number[]) => {
          const map = new Map<number, RealtimePresence>();
          for (const id of expertIds) {
            const set = inMemoryState.connections.get(id);
            map.set(id, set && set.size > 0 ? RealtimePresence.ONLINE : RealtimePresence.OFFLINE);
          }
          return map;
        }),
      setConsultationState: vi
        .fn()
        .mockImplementation(
          async (expertId: number, state: ConsultationState) => {
            inMemoryState.consultation.set(expertId, state);
          },
        ),
      getConsultationState: vi
        .fn()
        .mockImplementation(async (expertId: number) => {
          return inMemoryState.consultation.get(expertId) || ConsultationState.IDLE;
        }),
      getBatchConsultationStates: vi
        .fn()
        .mockImplementation(async (expertIds: number[]) => {
          const map = new Map<number, ConsultationState>();
          for (const id of expertIds) {
            map.set(id, inMemoryState.consultation.get(id) || ConsultationState.IDLE);
          }
          return map;
        }),
      setCachedAvailability: vi
        .fn()
        .mockImplementation(
          async (expertId: number, mode: AvailabilityMode) => {
            inMemoryState.availability.set(expertId, mode);
          },
        ),
      getCachedAvailability: vi
        .fn()
        .mockImplementation(async (expertId: number) => {
          return inMemoryState.availability.get(expertId) || null;
        }),
      getBatchCachedAvailability: vi
        .fn()
        .mockImplementation(async (expertIds: number[]) => {
          const map = new Map<number, AvailabilityMode | null>();
          for (const id of expertIds) {
            map.set(id, inMemoryState.availability.get(id) || null);
          }
          return map;
        }),
      getLastStatus: vi.fn().mockImplementation(async (expertId: number) => {
        return inMemoryState.lastStatus.get(expertId) || null;
      }),
      setLastStatus: vi
        .fn()
        .mockImplementation(async (expertId: number, status: string) => {
          inMemoryState.lastStatus.set(expertId, status);
        }),
      publishPresenceChanged: vi.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    mockRedis = {
      subscribe: vi.fn().mockResolvedValue(undefined),
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };

    service = new PresenceService(
      mockDb as any,
      mockRedis as any,
      mockRedisRepo as any,
      mockEventEmitter as any,
    );
  });

  describe('Multi-connection & Lifecycle', () => {
    it('first connection makes expert online and publishes event', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');

      expect(mockRedisRepo.registerConnection).toHaveBeenCalledWith(
        expertId,
        'socket-tab-1',
      );
      expect(mockRedisRepo.publishPresenceChanged).toHaveBeenCalledWith(
        expertId,
        'online',
      );
      expect(inMemoryState.lastStatus.get(expertId)).toBe('online');
    });

    it('second connection does not emit duplicate event', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      mockRedisRepo.publishPresenceChanged.mockClear();

      // Open second tab
      await service.connect(expertId, 'socket-tab-2');

      expect(mockRedisRepo.registerConnection).toHaveBeenCalledWith(
        expertId,
        'socket-tab-2',
      );
      // Status remained 'online', so publishPresenceChanged should not be called
      expect(mockRedisRepo.publishPresenceChanged).not.toHaveBeenCalled();
    });

    it('closing one tab while second tab is open keeps expert online', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      await service.connect(expertId, 'socket-tab-2');
      mockRedisRepo.publishPresenceChanged.mockClear();

      // Close tab 1
      await service.disconnect(expertId, 'socket-tab-1');

      expect(mockRedisRepo.removeConnection).toHaveBeenCalledWith(
        expertId,
        'socket-tab-1',
      );
      // Tab 2 still active -> expert stays online -> no status change event
      expect(mockRedisRepo.publishPresenceChanged).not.toHaveBeenCalled();
      const currentStatus = await service.getStatus(expertId);
      expect(currentStatus).toBe('online');
    });

    it('closing final connection makes expert offline and publishes event', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      mockRedisRepo.publishPresenceChanged.mockClear();

      // Close final tab
      await service.disconnect(expertId, 'socket-tab-1');

      expect(mockRedisRepo.removeConnection).toHaveBeenCalledWith(
        expertId,
        'socket-tab-1',
      );
      expect(mockRedisRepo.publishPresenceChanged).toHaveBeenCalledWith(
        expertId,
        'offline',
      );
      const currentStatus = await service.getStatus(expertId);
      expect(currentStatus).toBe('offline');
    });

    it('heartbeat refreshes TTL and does not emit events', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      mockRedisRepo.publishPresenceChanged.mockClear();

      await service.heartbeat(expertId, 'socket-tab-1');

      expect(mockRedisRepo.refreshHeartbeat).toHaveBeenCalledWith(
        expertId,
        'socket-tab-1',
      );
      expect(mockRedisRepo.publishPresenceChanged).not.toHaveBeenCalled();
    });
  });

  describe('Manual Availability', () => {
    it('switching to unavailable while online makes client status offline', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      mockRedisRepo.publishPresenceChanged.mockClear();

      await service.setAvailability(expertId, AvailabilityMode.UNAVAILABLE);

      expect(mockRedisRepo.setCachedAvailability).toHaveBeenCalledWith(
        expertId,
        'unavailable',
      );
      expect(mockRedisRepo.publishPresenceChanged).toHaveBeenCalledWith(
        expertId,
        'offline',
      );

      const status = await service.getStatus(expertId);
      expect(status).toBe('offline');
    });

    it('switching back to available while online restores online status', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      await service.setAvailability(expertId, AvailabilityMode.UNAVAILABLE);
      mockRedisRepo.publishPresenceChanged.mockClear();

      await service.setAvailability(expertId, AvailabilityMode.AVAILABLE);

      expect(mockRedisRepo.publishPresenceChanged).toHaveBeenCalledWith(
        expertId,
        'online',
      );
      const status = await service.getStatus(expertId);
      expect(status).toBe('online');
    });

    it('setting available while offline remains offline', async () => {
      const expertId = 202; // not connected
      await service.setAvailability(expertId, AvailabilityMode.AVAILABLE);

      const status = await service.getStatus(expertId);
      expect(status).toBe('offline');
    });
  });

  describe('Consultation Lifecycle', () => {
    it('consultation starting sets busy status', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      mockRedisRepo.publishPresenceChanged.mockClear();

      await service.setBusy(expertId, 999);

      expect(mockRedisRepo.setConsultationState).toHaveBeenCalledWith(
        expertId,
        'busy',
        999,
      );
      expect(mockRedisRepo.publishPresenceChanged).toHaveBeenCalledWith(
        expertId,
        'busy',
      );

      const status = await service.getStatus(expertId);
      expect(status).toBe('busy');
    });

    it('consultation ending restores online status', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      await service.setBusy(expertId, 999);
      mockRedisRepo.publishPresenceChanged.mockClear();

      await service.setIdle(expertId, 999);

      expect(mockRedisRepo.setConsultationState).toHaveBeenCalledWith(
        expertId,
        'idle',
      );
      expect(mockRedisRepo.publishPresenceChanged).toHaveBeenCalledWith(
        expertId,
        'online',
      );

      const status = await service.getStatus(expertId);
      expect(status).toBe('online');
    });

    it('active consultation does not terminate when availability mode toggled to unavailable', async () => {
      const expertId = 101;
      await service.connect(expertId, 'socket-tab-1');
      await service.setBusy(expertId, 999);
      mockRedisRepo.publishPresenceChanged.mockClear();

      // Expert toggles to unavailable during call
      await service.setAvailability(expertId, AvailabilityMode.UNAVAILABLE);

      // Client sees offline, but consultation state remains busy in consultation domain
      const fullStatus = await service.getFullStatus(expertId);
      expect(fullStatus.consultationState).toBe('busy');
      expect(fullStatus.availabilityMode).toBe('unavailable');
      expect(fullStatus.status).toBe('offline');

      // When consultation ends later:
      await service.setIdle(expertId, 999);
      const afterEnd = await service.getFullStatus(expertId);
      expect(afterEnd.consultationState).toBe('idle');
      expect(afterEnd.status).toBe('offline'); // remains offline because availability is unavailable
    });
  });

  describe('Batch Query Efficiency (No N+1)', () => {
    it('getStatuses batches calls for multiple experts efficiently', async () => {
      const expertIds = [1, 2, 3, 4, 5];
      inMemoryState.availability.set(1, AvailabilityMode.AVAILABLE);
      inMemoryState.availability.set(2, AvailabilityMode.AVAILABLE);
      inMemoryState.availability.set(3, AvailabilityMode.UNAVAILABLE);
      inMemoryState.availability.set(4, AvailabilityMode.AVAILABLE);
      inMemoryState.availability.set(5, AvailabilityMode.AVAILABLE);

      inMemoryState.connections.set(1, new Set(['s1']));
      inMemoryState.connections.set(2, new Set(['s2']));
      inMemoryState.connections.set(3, new Set(['s3']));
      // 4 and 5 offline

      inMemoryState.consultation.set(2, ConsultationState.BUSY);

      const statuses = await service.getStatuses(expertIds);

      expect(mockRedisRepo.getBatchRealtimePresence).toHaveBeenCalledTimes(1);
      expect(mockRedisRepo.getBatchCachedAvailability).toHaveBeenCalledTimes(1);
      expect(mockRedisRepo.getBatchConsultationStates).toHaveBeenCalledTimes(1);

      expect(statuses.get(1)).toBe('online');
      expect(statuses.get(2)).toBe('busy');
      expect(statuses.get(3)).toBe('offline'); // unavailable
      expect(statuses.get(4)).toBe('offline'); // not connected
      expect(statuses.get(5)).toBe('offline'); // not connected
    });
  });
});
