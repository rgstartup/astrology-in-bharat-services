import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '@/modules/cart/domain/entities/cart.entity';
import { CartItem } from '../../domain/entities/cart-item.entity';
import { ICartRepository } from '../../domain/repositories/cart.repository.interface';

@Injectable()
export class TypeOrmCartRepository implements ICartRepository {
    constructor(
        @InjectRepository(Cart)
        private readonly cartRepo: Repository<Cart>,
        @InjectRepository(CartItem)
        private readonly cartItemRepo: Repository<CartItem>,
    ) { }

    async findByUserId(userId: number): Promise<Cart | null> {
        return this.cartRepo.findOne({
            where: { user: { id: userId } },
            relations: ['items', 'items.product'],
        });
    }

    async save(cart: Cart): Promise<Cart> {
        return this.cartRepo.save(cart);
    }

    create(data: Partial<Cart>): Cart {
        return this.cartRepo.create(data);
    }

    async findItem(cartId: number, productId: number): Promise<CartItem | null> {
        return this.cartItemRepo.findOne({
            where: { cart: { id: cartId }, product: { id: productId } },
        });
    }

    async saveItem(item: CartItem): Promise<CartItem> {
        return this.cartItemRepo.save(item);
    }

    async removeItem(item: CartItem): Promise<void> {
        await this.cartItemRepo.remove(item);
    }

    createItem(data: Partial<CartItem>): CartItem {
        return this.cartItemRepo.create(data);
    }
}
