import { Product } from '../entities/product.entity';

export interface IProductRepository {
    create(data: Partial<Product>): Product;
    save(product: Product): Promise<Product>;
    findAllActive(): Promise<Product[]>;
    findOne(id: number): Promise<Product | null>;
    update(id: number, data: Partial<Product>): Promise<void>;
    delete(id: number): Promise<void>;
}

export const IProductRepository = Symbol('IProductRepository');
