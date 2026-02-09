import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';
import { CreateDisputeDto } from '../dtos/create-dispute.dto';
import { UpdateDisputeStatusDto } from '../dtos/update-dispute-status.dto';
import { Dispute, DisputeStatus } from '../../domain/entities/dispute.entity';

@Injectable()
export class SupportService {
    constructor(
        @Inject(IDisputeRepository)
        private readonly disputeRepository: IDisputeRepository,
    ) { }

    async createDispute(userId: number, dto: CreateDisputeDto): Promise<Dispute> {
        // Map orderId or consultationId to itemId for backward compatibility
        const itemId = dto.itemId || dto.orderId || dto.consultationId;

        if (!itemId) {
            throw new Error('Either itemId, orderId, or consultationId must be provided');
        }

        const dispute = this.disputeRepository.create({
            type: dto.type,
            itemId,
            category: dto.category,
            description: dto.description,
            itemDetails: dto.itemDetails,
            userId,
            status: DisputeStatus.PENDING,
        });

        return this.disputeRepository.save(dispute);
    }

    async getAllDisputes(
        filters?: any,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: Dispute[]; total: number }> {
        return this.disputeRepository.findAll(filters, page, limit);
    }

    async getDisputeById(id: number): Promise<Dispute> {
        const dispute = await this.disputeRepository.findById(id);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }
        return dispute;
    }

    async updateDisputeStatus(id: number, dto: UpdateDisputeStatusDto): Promise<Dispute> {
        const dispute = await this.getDisputeById(id);

        await this.disputeRepository.update(id, dto);

        return this.getDisputeById(id);
    }

    async getDisputeStats(): Promise<any> {
        return this.disputeRepository.getStats();
    }
}
