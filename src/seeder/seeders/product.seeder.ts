import { Seeder } from 'typeorm-extension';
import { DataSource, In } from 'typeorm';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ProductCategory } from '@/modules/commerce/product/entities/category.entity';
import { ProductVariant } from '@/modules/commerce/product/entities/variants.entity';
import { ProductFulFillment } from '@/modules/commerce/product/entities/fulfillment.entity';
import { ProductInventory } from '@/modules/commerce/product/entities/inventory.entity';
import { ProductVariantPricing } from '@/modules/commerce/product/entities/pricing.entity';
import { ProductVariantPromotions } from '@/modules/commerce/product/entities/promotions.entity';
import { ProductMedia } from '@/modules/commerce/product/entities/media.entity';
import { Media } from '@/modules/media/entities/media.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { ProductType } from '@/modules/commerce/product/enum/product-type.enum';
import { ProductGroup } from '@/modules/commerce/product/enum/product-group.enum';
import { FulfillmentType } from '@/modules/commerce/product/enum/fulfillment-type.enum';
import { DeliveryType } from '@/modules/commerce/product/enum/delivery-type.enum';
import { DiscountType } from '@/modules/commerce/product/enum/discount-type.enum';
import { MediaRole } from '@/modules/commerce/product/enum/media-role.enum';
import {
  PricingStatus,
  PricingTargetAudience,
} from '@/modules/expert/shared/enums/pricing.enum';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { ExpertProducts } from '@/modules/expert/products/entities/expert-product.entity';
import { ExpertProductRelationType } from '@/modules/expert/products/enum/expert-product-relation-type.enum';

interface VariantSeedData {
  name: string;
  sku: string;
  attributes: Record<string, unknown>;
  description?: string;
  isDefault?: boolean;
  sortOrder?: number;
  fulfillment: {
    fulfillmentType: FulfillmentType;
    deliveryType: DeliveryType;
    shippingFee?: number;
    processingTime?: number;
    estimatedDeliveryMin?: number;
    estimatedDeliveryMax?: number;
  };
  inventory?: {
    stock: number;
    reservedStock?: number;
  };
  pricing: {
    amount: number;
    currency?: string;
    targetAudience?: PricingTargetAudience;
  };
  promotion?: {
    name: string;
    discountType: DiscountType;
    discountValue: number;
    targetAudience?: PricingTargetAudience;
    effectiveFrom?: Date;
    effectiveTo?: Date | null;
  };
}

interface ProductSeedData {
  name: string;
  type: ProductType;
  productGroup?: ProductGroup;
  description: string;
  shortDescription?: string;
  categorySlugs: string[];
  merchantEmail?: string;
  expertEmails?: string[];
  variants: VariantSeedData[];
}

export class ProductSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const productRepository = dataSource.getRepository(Product);
    const categoryRepository = dataSource.getRepository(ProductCategory);
    const variantRepository = dataSource.getRepository(ProductVariant);
    const fulfillmentRepository = dataSource.getRepository(ProductFulFillment);
    const inventoryRepository = dataSource.getRepository(ProductInventory);
    const pricingRepository = dataSource.getRepository(ProductVariantPricing);
    const promotionsRepository = dataSource.getRepository(ProductVariantPromotions);
    const productMediaRepository = dataSource.getRepository(ProductMedia);
    const mediaRepository = dataSource.getRepository(Media);
    const merchantRepository = dataSource.getRepository(MerchantAccount);
    const expertAccountRepository = dataSource.getRepository(ExpertAccount);
    const expertProductRepository = dataSource.getRepository(ExpertProducts);

    const products: ProductSeedData[] = [
      // =========================================================================
      // 1. PHYSICAL GOODS (GOODS)
      // =========================================================================

      // Rudraksha Category
      {
        name: 'Nepali 5 Mukhi Rudraksha Mala (108 Beads)',
        type: ProductType.GOODS,
        productGroup: ProductGroup.ITEM,
        description:
          'Sacred 5 Mukhi Rudraksha Mala sourced directly from the Himalayan foothills of Nepal. Energized with Vedic Shiva mantras, this 108-bead mala bestows inner calm, health, and spiritual alignment.',
        shortDescription: 'Authentic 108-bead energized Nepali 5 Mukhi Rudraksha Mala.',
        categorySlugs: ['rudraksha'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: '108 Beads - 8mm (Nepal Origin)',
            sku: 'RUD-5M-108-8MM',
            isDefault: true,
            sortOrder: 1,
            attributes: { beads: 108, size_mm: 8, origin: 'Nepal', energized: true },
            description: 'Standard 8mm beads crafted in auspicious red silk thread with traditional tassel.',
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 50.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 7,
            },
            inventory: { stock: 65, reservedStock: 2 },
            pricing: { amount: 1499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Shiva Auspicious Offer 15% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 15,
            },
          },
          {
            name: '108 Beads - 10mm Premium with Silver Caps',
            sku: 'RUD-5M-108-10MM',
            isDefault: false,
            sortOrder: 2,
            attributes: { beads: 108, size_mm: 10, origin: 'Nepal', silver_capped: true, energized: true },
            description: 'Large 10mm beads with 925 sterling silver caps on every bead for supreme durability.',
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 50.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 7,
            },
            inventory: { stock: 40, reservedStock: 0 },
            pricing: { amount: 2499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Silver Cap Special ₹300 OFF',
              discountType: DiscountType.FIXED,
              discountValue: 300,
            },
          },
        ],
      },
      {
        name: 'Siddha 1 to 14 Mukhi Rudraksha Collector Mala',
        type: ProductType.GOODS,
        productGroup: ProductGroup.ITEM,
        description:
          'The revered Siddha Mala contains 1 to 14 Mukhi Rudraksha beads alongside Gauri Shankar and Ganesh Rudraksha strung in pure silver wire. Bestows complete planetary harmony and spiritual mastery.',
        shortDescription: 'Master 1-14 Mukhi Rudraksha Collector Mala in pure silver wire.',
        categorySlugs: ['rudraksha'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Collector Grade 1 to 14 Mukhi in Pure Silver Wire',
            sku: 'RUD-SIDDHA-SILVER-14M',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              mukhi_range: '1-14 Mukhi + Gauri Shankar + Ganesh',
              metal: '925 Silver',
              certification: 'IGL Certified',
              origin: 'Nepal/Java',
            },
            description: 'Lab-certified rare mukhi beads assembled in handcrafted silver wire loop by master artisans.',
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 150.0,
              processingTime: 48,
              estimatedDeliveryMin: 2,
              estimatedDeliveryMax: 5,
            },
            inventory: { stock: 10, reservedStock: 1 },
            pricing: { amount: 45000.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Devotee Privilege 10% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 10,
            },
          },
        ],
      },

      // Gemstone Category
      {
        name: 'Natural Ceylon Blue Sapphire (Neelam)',
        type: ProductType.GOODS,
        productGroup: ProductGroup.ITEM,
        description:
          '100% Natural, unheated & untreated Ceylon Blue Sapphire certified by GIA/IGI. Known in Jyotish as the powerful gemstone for Lord Saturn (Shani Dev) to bestow instant mental clarity, focus, and prosperity.',
        shortDescription: 'Certified untreated Ceylon Blue Sapphire (Neelam).',
        categorySlugs: ['gemstone'],
        merchantEmail: 'dr.priya@astrologyinbharat.com',
        variants: [
          {
            name: '3.25 Carat (3.6 Ratti) Untreated Ceylon Sapphire',
            sku: 'GEM-NEELAM-325-SRI',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              carat: 3.25,
              ratti: 3.6,
              origin: 'Sri Lanka (Ceylon)',
              treatment: 'Unheated & Untreated',
              lab_cert: 'GIA & IGI Certified',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 100.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 5,
            },
            inventory: { stock: 15, reservedStock: 1 },
            pricing: { amount: 18500.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
          {
            name: '5.50 Carat (6.1 Ratti) Premium Royal Blue Sapphire',
            sku: 'GEM-NEELAM-550-SRI',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              carat: 5.5,
              ratti: 6.1,
              origin: 'Sri Lanka (Ceylon)',
              treatment: 'Unheated & Untreated',
              lab_cert: 'GIA Certified',
              color: 'Royal Cornflower Blue',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 150.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 5,
            },
            inventory: { stock: 8, reservedStock: 0 },
            pricing: { amount: 42000.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Natural Zambian Emerald (Panna)',
        type: ProductType.GOODS,
        productGroup: ProductGroup.ITEM,
        description:
          'High-clarity, eye-clean Zambian Emerald certified for Jyotish remedies of Mercury (Budha). Enhances intellect, eloquence, trade fortunes, and nervous balance.',
        shortDescription: 'Natural eye-clean Zambian Emerald (Panna) for Budha.',
        categorySlugs: ['gemstone'],
        merchantEmail: 'dr.priya@astrologyinbharat.com',
        variants: [
          {
            name: '4.00 Carat (4.45 Ratti) Vivid Green Zambian Emerald',
            sku: 'GEM-PANNA-400-ZAM',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              carat: 4.0,
              ratti: 4.45,
              origin: 'Zambia',
              color: 'Vivid Green',
              clarity: 'Eye Clean',
              lab_cert: 'IGI Certified',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 100.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 5,
            },
            inventory: { stock: 20, reservedStock: 2 },
            pricing: { amount: 14000.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Budha Planetary Blessing 10% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 10,
            },
          },
        ],
      },

      // Yantra Category
      {
        name: 'Shree Sampurna Maha Lakshmi Yantra',
        type: ProductType.GOODS,
        productGroup: ProductGroup.ITEM,
        description:
          'Hand-engraved Sacred Shree Sampurna Maha Lakshmi Yantra featuring 13 auspicious wealth yantras in one sacred geometric plate. Activated with Vedic rituals by priests in Varanasi.',
        shortDescription: '24K Gold/Copper energized Shree Sampurna Maha Lakshmi Yantra.',
        categorySlugs: ['yantra'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: '6x6 Inch Gold Plated Heavy Copper Plate',
            sku: 'YAN-SHREE-6X6-GOLD',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              size: '6x6 inches',
              material: 'Copper with 24K Gold Polish',
              energized_by: 'Vedic Priests',
              includes_frame: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 50.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 6,
            },
            inventory: { stock: 50, reservedStock: 3 },
            pricing: { amount: 1299.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Maha Lakshmi Kripa 20% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 20,
            },
          },
          {
            name: '9x9 Inch Pure Heavy Copper Energized Plate',
            sku: 'YAN-SHREE-9X9-COPPER',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              size: '9x9 inches',
              material: 'Pure Heavy Copper 99.9%',
              energized_by: 'Vedic Priests',
              includes_frame: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 60.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 6,
            },
            inventory: { stock: 35, reservedStock: 0 },
            pricing: { amount: 1899.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Mahamrityunjaya Kavach & Protective Yantra Plate',
        type: ProductType.GOODS,
        productGroup: ProductGroup.ITEM,
        description:
          'Protective Lord Shiva Mahamrityunjaya Yantra designed for home temples and altar protection against negative energies and planetary afflictions.',
        shortDescription: 'Energized Mahamrityunjaya Protective Yantra.',
        categorySlugs: ['yantra'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Silver Plated 5x5 Inch Protective Yantra',
            sku: 'YAN-MRITYU-5X5-SILVER',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              size: '5x5 inches',
              material: 'Silver Plated Brass',
              deity: 'Lord Shiva',
              energized: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 50.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 6,
            },
            inventory: { stock: 45, reservedStock: 1 },
            pricing: { amount: 999.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Book Category
      {
        name: 'Brihat Parashara Hora Shastra (2 Volumes Set)',
        type: ProductType.GOODS,
        productGroup: ProductGroup.BOOK,
        description:
          'The foundational master text of Vedic Astrology (Jyotisha) by Sage Parashara. Complete Sanskrit shlokas with exhaustive Hindi & English commentaries covering all classical yogas, dashas, and remedies.',
        shortDescription: 'The supreme encyclopedia of Vedic astrology in 2 deluxe volumes.',
        categorySlugs: ['book'],
        merchantEmail: 'vedic.books.emporium@astrologyinbharat.com',
        variants: [
          {
            name: 'Hardcover Hindi & Sanskrit Edition (Pt. Devchandra Jha)',
            sku: 'BOK-BPHS-HC-HI',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              volumes: 2,
              pages: 1450,
              language: 'Hindi & Sanskrit',
              binding: 'Hardcover Deluxe',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 70.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 7,
            },
            inventory: { stock: 30, reservedStock: 0 },
            pricing: { amount: 1450.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
          {
            name: 'Deluxe English Commentary Edition (2 Volumes)',
            sku: 'BOK-BPHS-EN-2VOL',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              volumes: 2,
              pages: 1600,
              language: 'English',
              binding: 'Hardcover',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 70.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 7,
            },
            inventory: { stock: 25, reservedStock: 1 },
            pricing: { amount: 1850.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Lal Kitab Ke Asan Aur Achook Upay',
        type: ProductType.GOODS,
        productGroup: ProductGroup.BOOK,
        description:
          'A comprehensive and easy-to-implement handbook on Lal Kitab remedies for health, finances, career obstacles, and evil-eye removal.',
        shortDescription: 'Classic practical Lal Kitab astrological remedies guide.',
        categorySlugs: ['book'],
        merchantEmail: 'vedic.books.emporium@astrologyinbharat.com',
        variants: [
          {
            name: 'Complete Lal Kitab Remedies Handbook (Hindi)',
            sku: 'BOK-LK-UPAY-HI',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              pages: 480,
              language: 'Hindi',
              binding: 'Paperback',
              edition: '2026 Revised',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.PHYSICAL,
              deliveryType: DeliveryType.SHIPPING,
              shippingFee: 40.0,
              processingTime: 24,
              estimatedDeliveryMin: 3,
              estimatedDeliveryMax: 6,
            },
            inventory: { stock: 80, reservedStock: 5 },
            pricing: { amount: 399.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Book Lover Special 15% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 15,
            },
          },
        ],
      },

      // =========================================================================
      // 2. DIGITAL PRODUCTS (DIGITAL)
      // =========================================================================

      // Kundli Report Category (Case 2: Email SLA & Case 3: Instant Download)
      {
        name: 'Vedic Astrology Comprehensive Life Horoscope Report',
        type: ProductType.DIGITAL,
        productGroup: ProductGroup.REPORT,
        description:
          'In-depth personalized astrological dossier analyzing planetary placements, Vimshottari Mahadasha/Antardasha, divisional charts, career outlook, wealth potentials, and recommended gemstones.',
        shortDescription: 'Exhaustive personalized life prediction report delivered via Email.',
        categorySlugs: ['kundli-report'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        expertEmails: ['acharya.rajesh@astrologyinbharat.com'],
        variants: [
          {
            name: '50-Page Comprehensive Hindi Horoscope Report',
            sku: 'KUN-REP-HI-50',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              pages: 50,
              language: 'hi',
              charts: ['d1', 'd9', 'd10', 'd60'],
              delivery_channel: 'email',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 1440,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Introductory Special ₹100 OFF',
              discountType: DiscountType.FIXED,
              discountValue: 100,
            },
          },
          {
            name: '75-Page Deluxe English Life Prediction & Dasha Report',
            sku: 'KUN-REP-EN-75',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              pages: 75,
              language: 'en',
              charts: ['d1', 'd9', 'd10', 'd60'],
              includes_gemstone_guidance: true,
              delivery_channel: 'email',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 1440,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 799.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Instant 2026 Planetary Transit & Varshphal PDF',
        type: ProductType.DIGITAL,
        productGroup: ProductGroup.REPORT,
        description:
          'Instant downloadable PDF astrological guide detailing the major planetary transits of Jupiter, Saturn, Rahu, and Ketu for 2026 with month-by-month forecasting.',
        shortDescription: 'Instant download 2026 yearly transit forecast PDF.',
        categorySlugs: ['kundli-report'],
        merchantEmail: 'dr.priya@astrologyinbharat.com',
        expertEmails: ['dr.priya@astrologyinbharat.com'],
        variants: [
          {
            name: 'Aries (Mesha) 2026 Yearly Transit Forecast PDF',
            sku: 'TRN-2026-ARIES',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              zodiac_sign: 'aries',
              year: 2026,
              file_format: 'PDF',
              pages: 25,
              download_ready: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.DOWNLOAD,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 199.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
          {
            name: 'Taurus (Vrishabha) 2026 Yearly Transit Forecast PDF',
            sku: 'TRN-2026-TAURUS',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              zodiac_sign: 'taurus',
              year: 2026,
              file_format: 'PDF',
              pages: 25,
              download_ready: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.DOWNLOAD,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 199.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Vastu Report Category
      {
        name: 'Residential Vastu Energy & Layout Audit Report',
        type: ProductType.DIGITAL,
        productGroup: ProductGroup.REPORT,
        description:
          'Expert architectural and energy evaluation of residential properties based on 16 Vastu directional zones. Includes color therapy, elemental balances, and non-demolition remedies.',
        shortDescription: '16-Zone residential floor plan Vastu audit report.',
        categorySlugs: ['vastu-report'],
        merchantEmail: 'dr.priya@astrologyinbharat.com',
        expertEmails: ['dr.priya@astrologyinbharat.com'],
        variants: [
          {
            name: '2BHK / 3BHK Home Floorplan Vastu Analysis',
            sku: 'VAS-REP-RES-3BHK',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              directions_analyzed: 16,
              includes_floorplan_audit: true,
              turnaround_hours: 48,
              remedy_type: 'no_demolition',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 2880,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 1499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Home Harmony 15% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 15,
            },
          },
          {
            name: 'Commercial Office / Shop Vastu Prosperity Blueprint',
            sku: 'VAS-REP-COM-OFFICE',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              commercial_type: 'office_shop',
              directions_analyzed: 16,
              cash_flow_corner_analysis: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 2880,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 2499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Birth Chart Category
      {
        name: 'Vedic Janam Kundali & Navamsa Chart Detailed Dossier',
        type: ProductType.DIGITAL,
        productGroup: ProductGroup.REPORT,
        description:
          'High precision mathematical chart calculations including Lagna Chart (D1), Navamsa (D9), Shodashvarga, Ashtakavarga matrices, planetary degrees, and Nakshatra placements.',
        shortDescription: 'High-precision mathematical Janam Kundali & divisional charts.',
        categorySlugs: ['birth-chart'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        expertEmails: ['acharya.rajesh@astrologyinbharat.com'],
        variants: [
          {
            name: 'High-Resolution Printable Janam Kundali (PDF)',
            sku: 'CHT-JANAM-STD-PDF',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              divisional_charts: 16,
              language: 'hi',
              includes_planetary_degrees: true,
              downloadable: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.DOWNLOAD,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 249.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
          {
            name: 'Detailed 16-Varga Divisional Chart Breakdown with Ashtakavarga',
            sku: 'CHT-SHODASHVARGA-PDF',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              charts: 'Shodashvarga (D1 to D60)',
              includes_ashtakvarga: true,
              delivery_channel: 'email',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 720,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 1,
            },
            pricing: { amount: 499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Dosh Category
      {
        name: 'Kaal Sarp & Mangal Dosh Comprehensive Diagnosis',
        type: ProductType.DIGITAL,
        productGroup: ProductGroup.REPORT,
        description:
          'Targeted diagnostic analysis checking for 12 types of Kaal Sarp Dosh, Manglik (Kuja) Dosh, and Pitra Dosh with severity scoring and verified Vedic pariharas.',
        shortDescription: 'Specific dosh intensity calculations and remedies report.',
        categorySlugs: ['dosh'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        expertEmails: ['acharya.rajesh@astrologyinbharat.com'],
        variants: [
          {
            name: 'Kaal Sarp Dosh Intensity & 12 Types Classification',
            sku: 'DOSH-KAAL-SARP-REP',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              dosh_type: 'kaal_sarp',
              includes_12_types_analysis: true,
              remedial_mantras: true,
              puja_recommendation: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 1440,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 399.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Dosh Parihara Special 20% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 20,
            },
          },
          {
            name: 'Mangal (Kuja) & Pitra Dosh Relationship Impact Analysis',
            sku: 'DOSH-MANGAL-PITRA-REP',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              dosh_types: ['mangal_dosh', 'pitra_dosh'],
              marital_impact_score: true,
              remedies_included: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 1440,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 499.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Yog Category
      {
        name: 'Raj Yog, Gajakesari & Dhana Yog Wealth Analysis',
        type: ProductType.DIGITAL,
        productGroup: ProductGroup.REPORT,
        description:
          'Identifies over 32 auspicious Vedic yogas including Gajakesari, Budhaditya, Pancha Mahapurusha, and Dhana Yogas in your birth chart, along with their exact activation timelines.',
        shortDescription: 'Auspicious yog identification and wealth activation timing report.',
        categorySlugs: ['yog'],
        merchantEmail: 'dr.priya@astrologyinbharat.com',
        expertEmails: ['dr.priya@astrologyinbharat.com'],
        variants: [
          {
            name: '30+ Auspicious Vedic Yogas Detection & Activation Period',
            sku: 'YOG-RAJ-DHAN-REP',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              yogas_scanned: 32,
              includes_dhana_yog: true,
              activation_timelines: 'Vimshottari Dasha',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 1440,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 449.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Auspicious Yog Insight 10% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 10,
            },
          },
          {
            name: 'Career & Leadership Raj Yog In-Depth Dossier',
            sku: 'YOG-CAREER-RAJ-REP',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              focus: 'Career, Politics, Business Leadership',
              dashas_covered: 'Current + Next 2 Mahadashas',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.DIGITAL,
              deliveryType: DeliveryType.EMAIL,
              shippingFee: 0.0,
              processingTime: 1440,
              estimatedDeliveryMin: 1,
              estimatedDeliveryMax: 2,
            },
            pricing: { amount: 599.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // =========================================================================
      // 3. SERVICES (SERVICE)
      // =========================================================================

      // Puja Category (Case 4: Scheduled Service)
      {
        name: 'Sri Satyanarayan Maha Puja & Katha',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.RITUAL,
        description:
          'Sacred Satyanarayan Puja conducted on Purnima or auspicious dates to invoke Lord Vishnu’s blessings for family peace, abundance, and hurdle removal. Performed by experienced Vedic pandits.',
        shortDescription: 'Complete Vedic Satyanarayan Puja with sankalp and katha.',
        categorySlugs: ['puja'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Online Video Sankalp Puja with Panditji',
            sku: 'PUJA-SAT-ONLINE',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              duration_mins: 120,
              mode: 'video_live',
              samagri_provided: true,
              pandit_count: 1,
              prasad_dispatched: false,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 2100.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Festival Blessing ₹200 OFF',
              discountType: DiscountType.FIXED,
              discountValue: 200,
            },
          },
          {
            name: 'Grand In-Person Puja at Devotee Home with 2 Pandits',
            sku: 'PUJA-SAT-HOME-2P',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              duration_mins: 180,
              mode: 'in_person',
              samagri_included: true,
              pandit_count: 2,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 5100.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Rudrabhishek Puja at Kashi Vishwanath Kshetra',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.RITUAL,
        description:
          'Powerful Rudrabhishek ritual performed by certified priests in Varanasi chanting the Sri Rudram. Devotee names and gotra are taken in special sankalp.',
        shortDescription: 'Authentic Kashi Rudrabhishek with personalized sankalp.',
        categorySlugs: ['puja'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Live Streamed Rudrabhishek with Individual Sankalp',
            sku: 'PUJA-RUDRA-KASHI-LIVE',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              temple_location: 'Varanasi (Kashi)',
              duration_mins: 90,
              mode: 'live_stream',
              bilva_patra_count: 108,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 3100.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Maha Shivaratri Special 10% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 10,
            },
          },
        ],
      },

      // Havan Category
      {
        name: 'Maha Mrityunjaya Havan & Planetary Shanti Yagya',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.RITUAL,
        description:
          'Sacred fire ritual offering oblations with Maha Mrityunjaya Mantra for protection against critical illnesses, unexpected hazards, and severe longevity doshas.',
        shortDescription: 'Vedic fire ceremony with 1008/11000 Maha Mrityunjaya ahutis.',
        categorySlugs: ['havan'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Online 1008 Ahuti Maha Mrityunjaya Havan',
            sku: 'HAV-MRITYU-1008-LIVE',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              ahutis: 1008,
              duration_mins: 120,
              mode: 'video_live',
              deity: 'Mahakaal Shiva',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 4500.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'Health & Long Life 15% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 15,
            },
          },
          {
            name: 'Full 11,000 Ahuti Maha Shanti Havan at Vedic Ashram',
            sku: 'HAV-MRITYU-11000-ASHRAM',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              ahutis: 11000,
              duration_mins: 300,
              pandit_count: 5,
              mode: 'live_stream_recorded',
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 15000.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Navagraha Shanti & Dosha Nivaran Havan',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.RITUAL,
        description:
          'Harmonizes all 9 celestial grahas (Sun to Ketu) through specific samidhas and planetary mantras to balance astrological energies in the horoscope.',
        shortDescription: 'Comprehensive 9-Planet propitiation yagya ceremony.',
        categorySlugs: ['havan'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Complete 9-Planet Propitiation Havan (Online Sankalp)',
            sku: 'HAV-NAVAGRAHA-STD',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              planets_covered: 9,
              duration_mins: 90,
              mode: 'video_live',
              samagri_included: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 3500.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Sanskar Category
      {
        name: 'Vedic Namkaran Sanskar (Naming Ceremony)',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.RITUAL,
        description:
          'Sacred Vedic naming ritual determining the most auspicious first-letter syllable according to the newborn’s Janam Nakshatra and Pada, invoking longevity and virtue.',
        shortDescription: 'Traditional Vedic baby naming ceremony and nakshatra determination.',
        categorySlugs: ['sanskar'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Online Auspicious Namkaran Puja & Janam Nakshatra Guidance',
            sku: 'SAN-NAM-ONLINE',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              duration_mins: 60,
              mode: 'video_live',
              includes_nakshatra_name_letters: true,
              pandit_count: 1,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 2100.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
          {
            name: 'Traditional In-Home Namkaran Sanskar Ceremony',
            sku: 'SAN-NAM-HOME',
            isDefault: false,
            sortOrder: 2,
            attributes: {
              duration_mins: 120,
              mode: 'in_person',
              samagri_included: true,
              pandit_count: 1,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 4500.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
      {
        name: 'Vivah Sanskar (Vedic Wedding Rituals Consultation & Ceremony)',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.RITUAL,
        description:
          'Complete 7-Phera Vedic Vivah Sanskar solemnized by scholarly priests following authentic Grihya Sutra traditions including Kanyadaan, Saptapadi, and Havan.',
        shortDescription: 'Full-day Vedic wedding solemnization with scholarly pandits.',
        categorySlugs: ['sanskar'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        variants: [
          {
            name: 'Traditional 7-Phera Vedic Vivah Sanskar Service (Full Day)',
            sku: 'SAN-VIVAH-FULL',
            isDefault: true,
            sortOrder: 1,
            attributes: {
              duration_hours: 6,
              mode: 'in_person',
              pandit_count: 2,
              includes_lagna_patrika: true,
            },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.SCHEDULED,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 25000.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },

      // Instant Consultation & Guidance Service (Case 5: Instant Live Service)
      {
        name: 'Live Astrologer Consultation (Instant Audio/Video Call)',
        type: ProductType.SERVICE,
        productGroup: ProductGroup.SESSION,
        description:
          'Immediate one-on-one live consultation with verified Vedic Astrologers and Tarot Readers. Ask burning life questions on career, relationship compatibility, health, or remedies.',
        shortDescription: 'Connect instantly with verified astrologers on Audio or Video call.',
        categorySlugs: ['kundli-report', 'puja'],
        merchantEmail: 'acharya.rajesh@astrologyinbharat.com',
        expertEmails: [
          'acharya.rajesh@astrologyinbharat.com',
          'dr.priya@astrologyinbharat.com',
        ],
        variants: [
          {
            name: '15-Min Instant Audio Consultation',
            sku: 'CONS-AUD-15M',
            isDefault: true,
            sortOrder: 1,
            attributes: { channel: 'audio_call', duration_mins: 15, call_type: 'voip' },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.INSTANT,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 450.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
            promotion: {
              name: 'First Call Special 15% OFF',
              discountType: DiscountType.PERCENTAGE,
              discountValue: 15,
            },
          },
          {
            name: '30-Min Instant Video Consultation',
            sku: 'CONS-VID-30M',
            isDefault: false,
            sortOrder: 2,
            attributes: { channel: 'video_call', duration_mins: 30, call_type: 'webrtc' },
            fulfillment: {
              fulfillmentType: FulfillmentType.SERVICE,
              deliveryType: DeliveryType.INSTANT,
              shippingFee: 0.0,
              processingTime: 0,
              estimatedDeliveryMin: 0,
              estimatedDeliveryMax: 0,
            },
            pricing: { amount: 900.0, currency: 'INR', targetAudience: PricingTargetAudience.ALL },
          },
        ],
      },
    ];

    let seededProductCount = 0;
    let seededVariantCount = 0;

    for (const pData of products) {
      // 1. Resolve merchant ID if applicable
      let merchantId: number | null = null;
      if (pData.merchantEmail) {
        const merchant = await merchantRepository.findOne({
          where: { email: pData.merchantEmail },
        });
        if (merchant) {
          merchantId = merchant.id;
        }
      }

      // 2. Resolve categories
      const matchedCategories = await categoryRepository.find({
        where: { slug: In(pData.categorySlugs) },
      });

      // 3. Find or Create Product
      const defaultVariantData =
        pData.variants.find((v) => v.isDefault) || pData.variants[0];
      const primaryPrice = defaultVariantData?.pricing.amount || 0;
      const primaryStock = defaultVariantData?.inventory?.stock || 0;
      const primaryShipping = defaultVariantData?.fulfillment?.shippingFee || 0;
      const primarySku = defaultVariantData?.sku || null;
      const placeholderCoverUrl = `https://placehold.co/800x800/png?text=${encodeURIComponent(
        pData.name,
      )}`;

      let product = await productRepository.findOne({
        where: { name: pData.name },
        relations: ['categories', 'variants'],
      });

      if (!product) {
        product = productRepository.create({
          name: pData.name,
          type: pData.type,
          product_group: pData.productGroup || ProductGroup.ITEM,
          description: pData.description,
          short_description: pData.shortDescription || null,
          merchant_id: merchantId,
          categories: matchedCategories,
          stock: primaryStock,
          price: primaryPrice,
          original_price: primaryPrice,
          percentage_off: 0,
          is_shipping_chargeable: primaryShipping > 0,
          shipping_charge: primaryShipping,
          sku: primarySku,
          image_url: placeholderCoverUrl,
          gallery: [placeholderCoverUrl],
          is_active: true,
          category: pData.categorySlugs[0] || null,
        });
        product = await productRepository.save(product);
        console.log(`[ProductSeeder] Created Product: ${product.name} (${product.id})`);
      } else {
        product.type = pData.type;
        product.product_group = pData.productGroup || ProductGroup.ITEM;
        product.description = pData.description;
        product.short_description = pData.shortDescription || null;
        product.merchant_id = merchantId;
        product.categories = matchedCategories;
        product.stock = primaryStock;
        product.price = primaryPrice;
        product.original_price = primaryPrice;
        product.is_shipping_chargeable = primaryShipping > 0;
        product.shipping_charge = primaryShipping;
        product.sku = primarySku;
        product.image_url = placeholderCoverUrl;
        product.is_active = true;
        product.category = pData.categorySlugs[0] || null;
        product = await productRepository.save(product);
      }

      seededProductCount++;

      // 4. Seed ExpertProducts (Provider Relation)
      const targetExpertEmails = new Set<string>();
      if (pData.expertEmails && pData.expertEmails.length > 0) {
        pData.expertEmails.forEach((e) => targetExpertEmails.add(e));
      } else if (pData.merchantEmail) {
        targetExpertEmails.add(pData.merchantEmail);
      }

      for (const expertEmail of targetExpertEmails) {
        const expert = await expertAccountRepository.findOne({
          where: [
            { email: expertEmail },
            { user: { email: expertEmail } },
          ],
        });

        if (expert) {
          let expertProduct = await expertProductRepository.findOne({
            where: {
              expert_id: expert.id,
              product_id: product.id,
              relation_type: ExpertProductRelationType.PROVIDER,
            },
          });

          if (!expertProduct) {
            expertProduct = expertProductRepository.create({
              expert,
              expert_id: expert.id,
              product,
              product_id: product.id,
              relation_type: ExpertProductRelationType.PROVIDER,
            });
            await expertProductRepository.save(expertProduct);
            console.log(
              `  [ProductSeeder] Linked ExpertProduct: Expert ${expert.email || expertEmail} -> Product ${product.name} (PROVIDER)`,
            );
          }
        }
      }

      // 5. Seed Variants for this Product
      for (const vData of pData.variants) {
        let variant = await variantRepository.findOne({
          where: { sku: vData.sku },
        });

        if (!variant) {
          variant = variantRepository.create({
            product,
            product_id: String(product.id),
            name: vData.name,
            sku: vData.sku,
            attributes: vData.attributes,
            description: vData.description || null,
            is_default: !!vData.isDefault,
            is_active: true,
            sort_order: vData.sortOrder || 0,
          });
          variant = await variantRepository.save(variant);
          console.log(`  [ProductSeeder] Created Variant: ${variant.name} (${variant.sku})`);
        } else {
          variant.product = product;
          variant.product_id = String(product.id);
          variant.name = vData.name;
          variant.attributes = vData.attributes;
          variant.description = vData.description || null;
          variant.is_default = !!vData.isDefault;
          variant.is_active = true;
          variant.sort_order = vData.sortOrder || 0;
          variant = await variantRepository.save(variant);
        }

        const variantNumericId = Number(variant.id);

        // 5. Seed Fulfillment for this Variant
        let fulfillment = await fulfillmentRepository.findOne({
          where: { variant_id: variantNumericId },
        });

        if (!fulfillment) {
          fulfillment = fulfillmentRepository.create({
            variant,
            variant_id: variantNumericId,
            fulfillment_type: vData.fulfillment.fulfillmentType,
            delivery_type: vData.fulfillment.deliveryType,
            shipping_fee: vData.fulfillment.shippingFee || 0.0,
            processing_time: vData.fulfillment.processingTime || 0,
            estimated_delivery_min: vData.fulfillment.estimatedDeliveryMin || 0,
            estimated_delivery_max: vData.fulfillment.estimatedDeliveryMax || 0,
            is_active: true,
          });
          await fulfillmentRepository.save(fulfillment);
        } else {
          fulfillment.fulfillment_type = vData.fulfillment.fulfillmentType;
          fulfillment.delivery_type = vData.fulfillment.deliveryType;
          fulfillment.shipping_fee = vData.fulfillment.shippingFee || 0.0;
          fulfillment.processing_time = vData.fulfillment.processingTime || 0;
          fulfillment.estimated_delivery_min = vData.fulfillment.estimatedDeliveryMin || 0;
          fulfillment.estimated_delivery_max = vData.fulfillment.estimatedDeliveryMax || 0;
          fulfillment.is_active = true;
          await fulfillmentRepository.save(fulfillment);
        }

        // 6. Seed Inventory for physical goods
        if (
          vData.fulfillment.fulfillmentType === FulfillmentType.PHYSICAL &&
          vData.inventory
        ) {
          let inventory = await inventoryRepository.findOne({
            where: { variant_id: variantNumericId },
          });

          if (!inventory) {
            inventory = inventoryRepository.create({
              variant,
              variant_id: variantNumericId,
              stock: vData.inventory.stock,
              reserved_stock: vData.inventory.reservedStock || 0,
            });
            await inventoryRepository.save(inventory);
          } else {
            inventory.stock = vData.inventory.stock;
            inventory.reserved_stock = vData.inventory.reservedStock || 0;
            await inventoryRepository.save(inventory);
          }
        }

        // 7. Seed Variant Pricing
        let pricing = await pricingRepository.findOne({
          where: {
            variant_id: variantNumericId,
            target_audience:
              vData.pricing.targetAudience || PricingTargetAudience.ALL,
            status: PricingStatus.ACTIVE,
          },
        });

        if (!pricing) {
          pricing = pricingRepository.create({
            variant,
            variant_id: variantNumericId,
            amount: vData.pricing.amount,
            currency: vData.pricing.currency || 'INR',
            target_audience:
              vData.pricing.targetAudience || PricingTargetAudience.ALL,
            status: PricingStatus.ACTIVE,
            is_active: true,
            effective_from: new Date(),
          });
          await pricingRepository.save(pricing);
        } else {
          pricing.amount = vData.pricing.amount;
          pricing.currency = vData.pricing.currency || 'INR';
          pricing.is_active = true;
          await pricingRepository.save(pricing);
        }

        // 8. Seed Variant Promotion (if configured)
        if (vData.promotion) {
          let promo = await promotionsRepository.findOne({
            where: {
              variant_id: variantNumericId,
              name: vData.promotion.name,
            },
          });

          if (!promo) {
            promo = promotionsRepository.create({
              variant,
              variant_id: variantNumericId,
              name: vData.promotion.name,
              discount_type: vData.promotion.discountType,
              discount_value: vData.promotion.discountValue,
              target_audience:
                vData.promotion.targetAudience || PricingTargetAudience.ALL,
              effective_from: vData.promotion.effectiveFrom || new Date(),
              effective_to: vData.promotion.effectiveTo || null,
              is_active: true,
            });
            await promotionsRepository.save(promo);
          } else {
            promo.discount_type = vData.promotion.discountType;
            promo.discount_value = vData.promotion.discountValue;
            promo.is_active = true;
            await promotionsRepository.save(promo);
          }
        }

        // 9. Seed Media and ProductMedia placeholder
        const variantImageUrl = `https://placehold.co/600x600/png?text=${encodeURIComponent(
          vData.name,
        )}`;

        let media = await mediaRepository.findOne({
          where: { url: variantImageUrl },
        });

        if (!media) {
          media = mediaRepository.create({
            url: variantImageUrl,
            mime_type: 'image/png',
            alt_text: vData.name,
            file_name: `${vData.sku.toLowerCase()}.png`,
            file_size: 1024,
          });
          media = await mediaRepository.save(media);
        }

        let productMedia = await productMediaRepository.findOne({
          where: {
            product_id: product.id,
            variant_id: variantNumericId,
          },
        });

        if (!productMedia) {
          productMedia = productMediaRepository.create({
            product,
            product_id: product.id,
            variant,
            variant_id: variantNumericId,
            media,
            media_id: media.id,
            media_role: MediaRole.THUMBNAIL,
            is_primary: !!vData.isDefault,
            is_active: true,
            sort_order: vData.sortOrder || 0,
          });
          await productMediaRepository.save(productMedia);
        }

        seededVariantCount++;
      }
    }

    console.log(
      `[ProductSeeder] Finished seeding ${seededProductCount} products with ${seededVariantCount} variants, fulfillments, inventory, pricing, promotions, and media.`,
    );
  }
}
