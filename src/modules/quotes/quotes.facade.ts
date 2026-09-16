import { Injectable } from '@nestjs/common';
import { CreateQuoteUseCase } from './use-cases/create-quote.use-case';
import { FindAllQuotesUseCase } from './use-cases/find-all-quotes.use-case';
import { FindQuoteUseCase } from './use-cases/find-quote.use-case';
import { UpdateQuoteUseCase } from './use-cases/update-quote.use-case';
import { RemoveQuoteUseCase } from './use-cases/remove-quote.use-case';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesFacade {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly findAllQuotesUseCase: FindAllQuotesUseCase,
    private readonly findQuoteUseCase: FindQuoteUseCase,
    private readonly updateQuoteUseCase: UpdateQuoteUseCase,
    private readonly removeQuoteUseCase: RemoveQuoteUseCase,
  ) {}

  create(dto: CreateQuoteDto) {
    return this.createQuoteUseCase.execute(dto);
  }

  findAll() {
    return this.findAllQuotesUseCase.execute();
  }

  findOne(id: number) {
    return this.findQuoteUseCase.execute(id);
  }

  update(id: number, dto: UpdateQuoteDto) {
    return this.updateQuoteUseCase.execute(id, dto);
  }

  remove(id: number) {
    return this.removeQuoteUseCase.execute(id);
  }
}
