import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';

export interface ICartRepository {
    findByUserId(userId: number): Promise<Cart | null>;
    save(cart: Cart): Promise<Cart>;
    create(data: Partial<Cart>): Cart;
    findItem(cartId: number, productId: number): Promise<CartItem | null>;
    saveItem(item: CartItem): Promise<CartItem>;
    removeItem(item: CartItem): Promise<void>;
    createItem(data: Partial<CartItem>): CartItem;
}

export const ICartRepository = Symbol('ICartRepository');
