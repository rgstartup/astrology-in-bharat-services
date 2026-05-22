import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../../infrastructure/entities/quote.entity';
import { QuoteNotFoundError } from '../../domain/errors/quote.errors';

@Injectable()
export class RemoveQuoteUseCase {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.quoteRepository.findOneBy({ id });
    if (!existing) throw new QuoteNotFoundError(id);
    await this.quoteRepository.delete(id);
  }
}
