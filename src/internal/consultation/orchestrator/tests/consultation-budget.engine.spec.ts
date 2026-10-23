import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';

describe('ConsultationBudgetEngine', () => {
  let engine: ConsultationBudgetEngine;
  let mockRooms: Partial<ConsultationRoomRepository>;

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    mockRooms = {
      getActiveMode: vi.fn().mockResolvedValue('CHAT'),
      getBudget: vi.fn().mockResolvedValue(null),
      getAnchor: vi.fn().mockResolvedValue(null),
      isBillingHeld: vi.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationBudgetEngine,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: ConsultationRoomRepository, useValue: mockRooms },
      ],
    }).compile();

    engine = module.get<ConsultationBudgetEngine>(ConsultationBudgetEngine);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });
});
