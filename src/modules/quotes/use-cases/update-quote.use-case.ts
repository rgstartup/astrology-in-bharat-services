import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../entities/quote.entity';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { QuoteNotFoundError } from '../domain/errors/quote.errors';

@Injectable()
export class UpdateQuoteUseCase {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async execute(id: number, dto: UpdateQuoteDto): Promise<BooleanMessage> {
    const existing = await this.quoteRepository.findOneBy({ id });
    if (!existing) throw new QuoteNotFoundError(id);
    await this.quoteRepository.update(id, dto);
    return new BooleanMessage();
  }
}
