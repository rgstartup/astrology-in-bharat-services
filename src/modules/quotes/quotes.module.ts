import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesService } from './application/services/quotes.service';
import { Quote } from './domain/entities/quote.entity';
import { IQuoteRepository } from './domain/repositories/quote.repository.interface';
import { TypeOrmQuoteRepository } from './infrastructure/persistence/typeorm-quote.repository';
import { QuotesController } from './interfaces/controllers/quotes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quote])],
  controllers: [QuotesController],
  providers: [
    QuotesService,
    {
      provide: IQuoteRepository,
      useClass: TypeOrmQuoteRepository,
    },
  ],
  exports: [QuotesService, IQuoteRepository],
})
export class QuotesModule { }
