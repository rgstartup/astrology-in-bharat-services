import { describe, expect, it, vi } from 'vitest';
import { AddExpertToFavoritesUseCase } from '../use-cases/add-expert-to-favorites.usecase';
import { FindFavoriteExpertsUseCase } from '../use-cases/find-all-favorite-experts.usecase';
import { RemoveExpertFromFavoritesUseCase } from '../use-cases/remove-expert-from-favorites.usecase';
import { AddProductToFavoritesUseCase } from '../use-cases/add-product-to-favorites.usecase';
import { FindFavoriteProductsUseCase } from '../use-cases/find-all-favorite-products.usecase';
import { RemoveProductFromFavoritesUseCase } from '../use-cases/remove-product-from-favorites.usecase';
import { AddProductVariantToFavoritesUseCase } from '../use-cases/add-product-variant-to-favorites.usecase';
import { FindFavoriteProductVariantsUseCase } from '../use-cases/find-all-favorite-product-variants.usecase';
import { RemoveProductVariantFromFavoritesUseCase } from '../use-cases/remove-product-variant-from-favorites.usecase';
import { FavoritesService } from '../favorites.service';
import { FavoriteItemType } from '../enum';

describe('Client Favorites Module', () => {
  describe('Expert Favorites', () => {
    it('should return existing favorite if already added', async () => {
      const mockFavorite = {
        id: 1,
        client_id: 10,
        item_id: 101,
        item_type: FavoriteItemType.EXPERT,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockFavorite]),
            }),
          }),
        }),
      } as any;

      const useCase = new AddExpertToFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 101);

      expect(result).toEqual(mockFavorite);
    });

    it('should insert new favorite if not existing', async () => {
      const mockFavorite = {
        id: 2,
        client_id: 10,
        item_id: 102,
        item_type: FavoriteItemType.EXPERT,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockFavorite]),
          }),
        }),
      } as any;

      const useCase = new AddExpertToFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 102);

      expect(result).toEqual(mockFavorite);
    });

    it('should find favorite experts with optional search & pagination', async () => {
      const mockExperts = [
        { id: 101, name: 'Astrologer John', email: 'john@example.com' },
      ];

      const queryBuilder: any = Object.assign(Promise.resolve(mockExperts), {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      });

      const mockDb = {
        select: vi.fn().mockReturnValue(queryBuilder),
      } as any;

      const useCase = new FindFavoriteExpertsUseCase(mockDb);
      const result = await useCase.execute(10, {
        search: 'John',
        limit: 10,
        offset: 0,
        page: 1,
        skip: 0,
      });

      expect(result).toEqual(mockExperts);
    });

    it('should remove expert from favorites', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      } as any;

      const useCase = new RemoveExpertFromFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 101);

      expect(result.affected).toBe(1);
    });
  });

  describe('Product Favorites', () => {
    it('should add product to favorites if not already present', async () => {
      const mockFavorite = {
        id: 5,
        client_id: 10,
        item_id: 501,
        item_type: FavoriteItemType.PRODUCT,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockFavorite]),
          }),
        }),
      } as any;

      const useCase = new AddProductToFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 501);

      expect(result).toEqual(mockFavorite);
    });

    it('should find favorite products with search and pagination', async () => {
      const mockProducts = [
        { id: 501, name: 'Rudraksha Mala', description: 'Sacred beads' },
      ];

      const queryBuilder: any = Object.assign(Promise.resolve(mockProducts), {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      });

      const mockDb = {
        select: vi.fn().mockReturnValue(queryBuilder),
      } as any;

      const useCase = new FindFavoriteProductsUseCase(mockDb);
      const result = await useCase.execute(10, {
        search: 'Rudraksha',
        limit: 5,
        offset: 0,
        page: 1,
        skip: 0,
      });

      expect(result).toEqual(mockProducts);
    });

    it('should remove product from favorites', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 5 }]),
          }),
        }),
      } as any;

      const useCase = new RemoveProductFromFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 501);

      expect(result.affected).toBe(1);
    });
  });

  describe('Product Variant Favorites', () => {
    it('should add product variant to favorites', async () => {
      const mockFavorite = {
        id: 9,
        client_id: 10,
        item_id: 901,
        item_type: FavoriteItemType.PRODUCT_VARIANT,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockFavorite]),
          }),
        }),
      } as any;

      const useCase = new AddProductVariantToFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 901);

      expect(result).toEqual(mockFavorite);
    });

    it('should find favorite product variants with joined product data', async () => {
      const mockVariants = [
        {
          id: 901,
          name: 'Variant 1',
          product: { id: 501, name: 'Parent Product' },
        },
      ];

      const queryBuilder: any = Object.assign(Promise.resolve(mockVariants), {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      });

      const mockDb = {
        select: vi.fn().mockReturnValue(queryBuilder),
      } as any;

      const useCase = new FindFavoriteProductVariantsUseCase(mockDb);
      const result = await useCase.execute(10, {
        search: 'Variant 1',
        limit: 10,
        offset: 0,
        page: 1,
        skip: 0,
      });

      expect(result).toEqual(mockVariants);
    });

    it('should remove product variant from favorites', async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 9 }]),
          }),
        }),
      } as any;

      const useCase = new RemoveProductVariantFromFavoritesUseCase(mockDb);
      const result = await useCase.execute(10, 901);

      expect(result.affected).toBe(1);
    });
  });

  describe('FavoritesService Delegation', () => {
    it('should delegate all calls to underlying use cases', async () => {
      const addExpertToFavoritesUseCase = { execute: vi.fn().mockResolvedValue({ id: 1 }) } as any;
      const findFavoriteExpertsUseCase = { execute: vi.fn().mockResolvedValue([]) } as any;
      const removeExpertFromFavoritesUseCase = { execute: vi.fn().mockResolvedValue({ affected: 1 }) } as any;
      const addProductToFavoritesUseCase = { execute: vi.fn().mockResolvedValue({ id: 2 }) } as any;
      const findFavoriteProductsUseCase = { execute: vi.fn().mockResolvedValue([]) } as any;
      const removeProductFromFavoritesUseCase = { execute: vi.fn().mockResolvedValue({ affected: 1 }) } as any;
      const addProductVariantToFavoritesUseCase = { execute: vi.fn().mockResolvedValue({ id: 3 }) } as any;
      const findFavoriteProductVariantsUseCase = { execute: vi.fn().mockResolvedValue([]) } as any;
      const removeProductVariantFromFavoritesUseCase = { execute: vi.fn().mockResolvedValue({ affected: 1 }) } as any;

      const service = new FavoritesService(
        addExpertToFavoritesUseCase,
        findFavoriteExpertsUseCase,
        removeExpertFromFavoritesUseCase,
        addProductToFavoritesUseCase,
        findFavoriteProductsUseCase,
        removeProductFromFavoritesUseCase,
        addProductVariantToFavoritesUseCase,
        findFavoriteProductVariantsUseCase,
        removeProductVariantFromFavoritesUseCase,
      );

      await service.addExpertToFavorites(10, 101);
      expect(addExpertToFavoritesUseCase.execute).toHaveBeenCalledWith(10, 101);

      await service.findFavoriteExperts(10, {} as any);
      expect(findFavoriteExpertsUseCase.execute).toHaveBeenCalledWith(10, {});

      await service.removeExpertFromFavorites(10, 101);
      expect(removeExpertFromFavoritesUseCase.execute).toHaveBeenCalledWith(10, 101);

      await service.addProductToFavorites(10, 501);
      expect(addProductToFavoritesUseCase.execute).toHaveBeenCalledWith(10, 501);

      await service.findFavoriteProducts(10, {} as any);
      expect(findFavoriteProductsUseCase.execute).toHaveBeenCalledWith(10, {});

      await service.removeProductFromFavorites(10, 501);
      expect(removeProductFromFavoritesUseCase.execute).toHaveBeenCalledWith(10, 501);

      await service.addProductVariantToFavorites(10, 901);
      expect(addProductVariantToFavoritesUseCase.execute).toHaveBeenCalledWith(10, 901);

      await service.findFavoriteProductVariants(10, {} as any);
      expect(findFavoriteProductVariantsUseCase.execute).toHaveBeenCalledWith(10, {});

      await service.removeProductVariantFromFavorites(10, 901);
      expect(removeProductVariantFromFavoritesUseCase.execute).toHaveBeenCalledWith(10, 901);
    });
  });
});
