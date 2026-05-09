import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../../infrastructure/entities/quote.entity';
import { CreateQuoteDto } from '../../api/dto/create-quote.dto';

const SEED_QUOTES = [
  {
    text: 'Astrology is the supreme limb (eye) of the Vedas.',
    author: 'Sage Parasara',
    source: 'Brihat Parasara Hora Shastra',
  },
  {
    text: 'There are many incarnations of the unborn Lord. Janardana (Vishnu) has incarnated as the navagrahas (planets) to bestow on the living beings the results of their Karmas.',
    author: 'Sage Parasara',
    source: 'Brihat Parasara Hora Shastra',
  },
  {
    text: 'Whatever has been acquired by a person through his karma — whether good or bad — done in previous births, the hora now reveals its fruition or effects.',
    author: 'Varahamihira',
    source: 'Brihat Jataka',
  },
  {
    text: 'A child is born on that day and at that hour when the celestial rays are in mathematical harmony with his individual karma.',
    author: 'Sri Yukteswar',
  },
  {
    text: 'There is nothing in the world like a horoscope to help men in the acquisition of wealth, to save them like a boat in a sea of troubles and to serve them as a guide in their journeys.',
    author: 'Vaidyanatha Dikshita',
    source: 'Jataka Parijata',
  },
];

@Injectable()
export class CreateQuoteUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreateQuoteUseCase.name);

  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  async onModuleInit() {
    const count = await this.quoteRepository.count();
    if (count === 0) {
      this.logger.log('Seeding dummy quotes...');
      await this.quoteRepository.save(SEED_QUOTES);
      this.logger.log('Dummy quotes seeded successfully.');
    }
  }

  async execute(dto: CreateQuoteDto): Promise<Quote> {
    const quote = this.quoteRepository.create(dto);
    return this.quoteRepository.save(quote);
  }
}
