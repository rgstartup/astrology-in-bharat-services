import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeConsultationUseCase } from '../use-cases/resume-consultation.use-case';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';

const consultationRow = {
  id: 5,
  client_id: 1,
  expert_id: 2,
  mode: 'voice',
  status: ConsultationStatus.ACTIVE,
};

const makeDb = (activeSessions: any[] = [], row = consultationRow) => {
  const values = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: 101 }]),
  });
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([row]),
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
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: updateWhere,
      }),
    }),
  };
  return { db, values, updateWhere };
};

const makeServer = () => {
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  return { server: { to } as any, to, emit };
};

const adapters = () => ({
  voice: {
    onStart: vi.fn().mockResolvedValue(undefined),
    onResume: vi.fn().mockResolvedValue(undefined),
  } as any,
  chat: {
    onStart: vi.fn().mockResolvedValue(undefined),
    onResume: vi.fn().mockResolvedValue(undefined),
  } as any,
  video: {
    onStart: vi.fn().mockResolvedValue(undefined),
    onResume: vi.fn().mockResolvedValue(undefined),
  } as any,
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

const voiceService = () =>
  ({
    generateToken: vi.fn().mockResolvedValue({
      token: 'fake-rtc-token',
      tokenExpiresAt: '2026-10-30T12:00:00Z',
    }),
  }) as any;

describe('ResumeConsultationUseCase mode-separated flows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens a new active session for voice and emits consultation:resumed:voice', async () => {
    const { server, to, emit } = makeServer();
    const { db, values } = makeDb([]);
    const a = adapters();
    const v = voiceService();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      v,
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
    expect(result.mode).toBe('voice');
    expect(result.token).toBe('fake-rtc-token');
    expect(result.channelName).toBe('consultation:voice:5');

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

    expect(v.generateToken).toHaveBeenCalledTimes(2);
    expect(to).toHaveBeenCalledWith('client:1');
    expect(to).toHaveBeenCalledWith('expert:2');
    expect(to).toHaveBeenCalledWith('consultation:5');
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_VOICE,
      expect.objectContaining({ consultationId: 5, mode: 'voice' }),
    );
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED,
      expect.objectContaining({ consultationId: 5, mode: 'voice' }),
    );
  });

  it('resumes in chat mode and emits consultation:resumed:chat without voice tokens', async () => {
    const { server, emit } = makeServer();
    const chatRow = { ...consultationRow, mode: 'chat' };
    const { db } = makeDb([], chatRow);
    const a = adapters();
    const v = voiceService();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      v,
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
    expect(result.mode).toBe('chat');
    expect(result.token).toBeUndefined();
    expect(v.generateToken).not.toHaveBeenCalled();

    expect(a.chat.onResume).toHaveBeenCalledWith(5, {
      anchorIso: expect.any(String),
      baseSeconds: 120,
    });
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_CHAT,
      expect.objectContaining({ consultationId: 5, mode: 'chat' }),
    );
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED,
      expect.objectContaining({ consultationId: 5, mode: 'chat' }),
    );
  });

  it('resumes in video mode when targetMode is video and emits consultation:resumed:video', async () => {
    const { server, emit } = makeServer();
    const chatRow = { ...consultationRow, mode: 'chat' };
    const { db, updateWhere } = makeDb([], chatRow);
    const a = adapters();
    const v = voiceService();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      v,
      a.chat,
      a.voice,
      a.video,
    );

    const result = await useCase.execute(server, {
      consultationId: 5,
      actorId: 1,
      actorType: 'client',
      targetMode: 'video',
    });

    expect(result.state).toBe('active');
    expect(result.mode).toBe('video');
    expect(result.token).toBe('fake-rtc-token');
    expect(updateWhere).toHaveBeenCalled();
    expect(a.video.onStart).toHaveBeenCalled();
    expect(a.video.onResume).toHaveBeenCalled();

    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED_VIDEO,
      expect.objectContaining({ consultationId: 5, mode: 'video' }),
    );
  });

  it('does not duplicate the session when one is already active', async () => {
    const { server } = makeServer();
    const { db, values } = makeDb([{ id: 42 }]);
    const a = adapters();
    const v = voiceService();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(),
      rooms(),
      v,
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
    const v = voiceService();
    const useCase = new ResumeConsultationUseCase(
      db as any,
      budget(0),
      rooms(),
      v,
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
