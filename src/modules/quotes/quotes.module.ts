import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './infrastructure/entities/quote.entity';
import { QuotesController } from './api/controllers/quotes.controller';
import { QuotesFacade } from './application/quotes.facade';
import { CreateQuoteUseCase } from './application/use-cases/create-quote.use-case';
import { FindAllQuotesUseCase } from './application/use-cases/find-all-quotes.use-case';
import { FindQuoteUseCase } from './application/use-cases/find-quote.use-case';
import { UpdateQuoteUseCase } from './application/use-cases/update-quote.use-case';
import { RemoveQuoteUseCase } from './application/use-cases/remove-quote.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Quote])],
  controllers: [QuotesController],
  providers: [
    QuotesFacade,
    CreateQuoteUseCase,
    FindAllQuotesUseCase,
    FindQuoteUseCase,
    UpdateQuoteUseCase,
    RemoveQuoteUseCase,
  ],
})
export class QuotesModule {}
