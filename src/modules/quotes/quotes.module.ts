import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './domain/entities/quote.entity';
import { QuotesController } from './interfaces/controllers/quotes.controller';
import { QuotesService } from './application/services/quotes.service';
import { IQuoteRepository } from './domain/repositories/quote.repository.interface';
import { TypeOrmQuoteRepository } from './infrastructure/persistence/typeorm-quote.repository';

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
