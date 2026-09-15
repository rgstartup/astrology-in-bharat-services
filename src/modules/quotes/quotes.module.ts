import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { QuotesController } from './controllers/quotes.controller';
import { QuotesFacade } from './quotes.facade';
import { CreateQuoteUseCase } from './use-cases/create-quote.use-case';
import { FindAllQuotesUseCase } from './use-cases/find-all-quotes.use-case';
import { FindQuoteUseCase } from './use-cases/find-quote.use-case';
import { UpdateQuoteUseCase } from './use-cases/update-quote.use-case';
import { RemoveQuoteUseCase } from './use-cases/remove-quote.use-case';

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
