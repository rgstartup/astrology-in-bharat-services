import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Quote } from '../../domain/entities/quote.entity';
import { IQuoteRepository } from '../../domain/repositories/quote.repository.interface';

@Injectable()
export class TypeOrmQuoteRepository implements IQuoteRepository {
    constructor(
        @InjectRepository(Quote)
        private readonly repository: Repository<Quote>,
    ) { }

    create(data: Partial<Quote>): Quote {
        return this.repository.create(data);
    }

    async save(quote: Quote | Quote[]): Promise<any> {
        return this.repository.save(quote as any);
    }

    async findAll(): Promise<Quote[]> {
        return this.repository.find();
    }

    async findOneById(id: number): Promise<Quote | null> {
        return this.repository.findOneBy({ id });
    }

    async update(id: number, data: Partial<Quote>): Promise<void> {
        await this.repository.update(id, data);
    }

    async delete(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    async count(): Promise<number> {
        return this.repository.count();
    }

    getRepo(queryRunner?: QueryRunner): Repository<Quote> {
        if (queryRunner) {
            return queryRunner.manager.getRepository(Quote);
        }
        return this.repository;
    }
}
