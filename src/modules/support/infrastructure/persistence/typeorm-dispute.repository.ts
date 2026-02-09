import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from '../../domain/entities/dispute.entity';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';

@Injectable()
export class TypeOrmDisputeRepository implements IDisputeRepository {
  constructor(
    @InjectRepository(Dispute)
    private readonly repository: Repository<Dispute>,
  ) {}

  create(data: Partial<Dispute>): Dispute {
    return this.repository.create(data);
  }

  async save(dispute: Dispute): Promise<Dispute> {
    return this.repository.save(dispute);
  }

  async findById(id: number): Promise<Dispute | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findAll(
    filters?: any,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Dispute[]; total: number }> {
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.user', 'user');

    if (filters?.status) {
      query.andWhere('dispute.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('dispute.type = :type', { type: filters.type });
    }

    if (filters?.priority) {
      query.andWhere('dispute.priority = :priority', { priority: filters.priority });
    }

    query.orderBy('dispute.createdAt', 'DESC');

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

    return { data, total };
  }

  async update(id: number, data: Partial<Dispute>): Promise<void> {
    await this.repository.update(id, data);
  }

  async getStats(): Promise<any> {
    const total = await this.repository.count();
    const pending = await this.repository.count({ where: { status: DisputeStatus.PENDING } });
    const underReview = await this.repository.count({ where: { status: DisputeStatus.UNDER_REVIEW } });
    const resolved = await this.repository.count({ where: { status: DisputeStatus.RESOLVED } });
    const rejected = await this.repository.count({ where: { status: DisputeStatus.REJECTED } });

    return {
      total,
      pending,
      underReview,
      resolved,
      rejected,
    };
  }
}
