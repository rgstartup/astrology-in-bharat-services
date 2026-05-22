import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../../infrastructure/entities/quote.entity';
import { UpdateQuoteDto } from '../../api/dto/update-quote.dto';
import { QuoteNotFoundError } from '../../domain/errors/quote.errors';

@Injectable()
export class UpdateQuoteUseCase {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async execute(id: string, dto: UpdateQuoteDto): Promise<Quote> {
    const existing = await this.quoteRepository.findOneBy({ id });
    if (!existing) throw new QuoteNotFoundError(id);
    await this.quoteRepository.update(id, dto);
    return this.quoteRepository.findOneBy({ id }) as Promise<Quote>;
  }
}
