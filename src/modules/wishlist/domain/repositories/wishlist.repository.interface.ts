import { Wishlist } from '../entities/wishlist.entity';

export interface IWishlistRepository {
    create(data: Partial<Wishlist>): Wishlist;
    save(wishlist: Wishlist): Promise<Wishlist>;
    remove(wishlist: Wishlist): Promise<Wishlist>;
    find(options: any): Promise<Wishlist[]>;
    findOne(options: any): Promise<Wishlist | null>;
}

export const IWishlistRepository = Symbol('IWishlistRepository');
