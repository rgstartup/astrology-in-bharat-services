import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { ProductCategory } from '@/modules/commerce/product/entities/category.entity';

interface ProductCategorySeedData {
  name: string;
  slug: string;
}

export class ProductCategorySeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const categoryRepository = dataSource.getRepository(ProductCategory);

    const categories: ProductCategorySeedData[] = [
      // Physical Goods Categories
      { name: 'Books & Vedic Literature', slug: 'book' },
      { name: 'Sacred Yantras', slug: 'yantra' },
      { name: 'Certified Gemstones', slug: 'gemstone' },
      { name: 'Authentic Rudraksha', slug: 'rudraksha' },

      // Digital Products Categories
      { name: 'Kundli Reports', slug: 'kundli-report' },
      { name: 'Vastu Reports', slug: 'vastu-report' },
      { name: 'Birth Chart & Janam Patri', slug: 'birth-chart' },
      { name: 'Dosh Analysis & Remedies', slug: 'dosh' },
      { name: 'Yog & Combinations', slug: 'yog' },

      // Service Categories
      { name: 'Vedic Pujas', slug: 'puja' },
      { name: 'Havans & Yagyas', slug: 'havan' },
      { name: 'Vedic Sanskars', slug: 'sanskar' },
    ];

    let seededCount = 0;

    for (const cat of categories) {
      let existing = await categoryRepository.findOne({
        where: { slug: cat.slug },
      });

      if (!existing) {
        existing = categoryRepository.create({
          name: cat.name,
          slug: cat.slug,
        });
        await categoryRepository.save(existing);
        console.log(`[ProductCategorySeeder] Created Category: ${cat.name} (${cat.slug})`);
      } else {
        existing.name = cat.name;
        await categoryRepository.save(existing);
      }
      seededCount++;
    }

    console.log(`[ProductCategorySeeder] Successfully seeded ${seededCount} product categories.`);
  }
}
