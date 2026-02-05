import { Quote } from '../entities/quote.entity';

export interface IQuoteRepository {
    create(data: Partial<Quote>): Quote;
    save(quote: Quote | Quote[]): Promise<any>;
    findAll(): Promise<Quote[]>;
    findOneById(id: number): Promise<Quote | null>;
    update(id: number, data: Partial<Quote>): Promise<void>;
    delete(id: number): Promise<void>;
    count(): Promise<number>;
    getRepo(queryRunner?: any): any;
}

export const IQuoteRepository = Symbol('IQuoteRepository');
