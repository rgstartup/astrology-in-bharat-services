import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSession } from '../../domain/entities/live-session.entity';
import { ILiveSessionRepository } from '../../domain/repositories/live-session.repository.interface';
import { LiveSessionStatus } from '../../domain/enums/session-status.enum';

@Injectable()
export class TypeOrmLiveSessionRepository implements ILiveSessionRepository {
    constructor(
        @InjectRepository(LiveSession)
        private readonly repository: Repository<LiveSession>,
    ) { }

    create(data: Partial<LiveSession>): LiveSession {
        return this.repository.create(data);
    }

    async save(session: LiveSession): Promise<LiveSession> {
        return this.repository.save(session);
    }

    async findById(id: number): Promise<LiveSession | null> {
        return this.repository.findOne({ where: { id } });
    }

    async findAllActive(): Promise<LiveSession[]> {
        return this.repository.find({ where: { status: LiveSessionStatus.ACTIVE } });
    }

    async findAll(): Promise<LiveSession[]> {
        return this.repository.find();
    }

    async update(id: number, data: Partial<LiveSession>): Promise<void> {
        await this.repository.update(id, data);
    }
}
