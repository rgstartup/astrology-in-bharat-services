import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../domain/entities/wishlist.entity';
import { IWishlistRepository } from '../../domain/repositories/wishlist.repository.interface';

@Injectable()
export class TypeOrmWishlistRepository implements IWishlistRepository {
    constructor(
        @InjectRepository(Wishlist)
        private readonly repository: Repository<Wishlist>,
    ) { }

    create(data: Partial<Wishlist>): Wishlist {
        return this.repository.create(data);
    }

    async save(wishlist: Wishlist): Promise<Wishlist> {
        return this.repository.save(wishlist);
    }

    async remove(wishlist: Wishlist): Promise<Wishlist> {
        return this.repository.remove(wishlist);
    }

    async find(options: any): Promise<Wishlist[]> {
        return this.repository.find(options);
    }

    async findOne(options: any): Promise<Wishlist | null> {
        return this.repository.findOne(options);
    }
}
