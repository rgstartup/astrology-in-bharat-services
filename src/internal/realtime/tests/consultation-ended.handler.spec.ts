import { describe, expect, it, vi } from 'vitest';
import { ConsultationEndedHandler } from '../events/consultation-ended.handler';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';

describe('ConsultationEndedHandler', () => {
  it('broadcasts consultation:ended to the room when gateway server is initialized', () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const mockGateway = {
      server: { to },
    } as any;

    const handler = new ConsultationEndedHandler(mockGateway);

    const payload = {
      consultationId: 100,
      mode: 'chat' as const,
      endedBy: '10',
      reason: 'client_logout',
      totalDurationSeconds: 60,
      timestamp: new Date().toISOString(),
    };

    handler.handle(payload);

    expect(to).toHaveBeenCalledWith(SOCKET_ROOMS.CONSULTATION(100));
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED,
      payload,
    );
  });

  it('safely warns and returns when gateway server is not initialized', () => {
    const mockGateway = {
      server: null,
    } as any;

    const handler = new ConsultationEndedHandler(mockGateway);

    const payload = {
      consultationId: 100,
      mode: 'chat' as const,
      endedBy: '10',
      reason: 'client_logout',
      totalDurationSeconds: 60,
      timestamp: new Date().toISOString(),
    };

    expect(() => handler.handle(payload)).not.toThrow();
  });
});
