import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../../infrastructure/entities/quote.entity';
import { QuoteNotFoundError } from '../../domain/errors/quote.errors';

@Injectable()
export class FindQuoteUseCase {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async execute(id: number): Promise<Quote> {
    const quote = await this.quoteRepository.findOneBy({ id });
    if (!quote) throw new QuoteNotFoundError(id);
    return quote;
  }
}
