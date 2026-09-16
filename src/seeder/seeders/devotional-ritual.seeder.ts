import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { DevotionalRitual } from '@/modules/devotion/entities/devotional-ritual.entity';

export class DevotionalRitualSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(DevotionalRitual);

    const rituals = [
      {
        slug: 'rudrabhishek-puja',
        title: 'Rudrabhishek Puja',
        deity: 'Lord Shiva',
        description:
          'Sacred abhishekam of Shiva Linga with Panchamrit and Gangajal while chanting Sri Rudram to eradicate negative karmas and invoke peace and good health.',
        significance:
          'Destroys sins, cures prolonged illnesses, and brings spiritual peace and mental clarity.',
        default_samagri_list: [
          { item: 'Gangajal', quantity: '500 ml' },
          { item: 'Cow Milk', quantity: '1 litre' },
          { item: 'Curd (Dahi)', quantity: '250 gm' },
          { item: 'Honey (Madhu)', quantity: '100 gm' },
          { item: 'Ghee', quantity: '250 gm' },
          { item: 'Belpatra', quantity: '21 pcs' },
          { item: 'Dhatura & Bhasma', quantity: '1 packet' },
          { item: 'Roli, Chandan & Akshat', quantity: '1 packet' },
          { item: 'Camphor (Karpuram)', quantity: '50 gm' },
        ],
        suggested_duration_hours: 2.5,
        icon: 'fa-solid fa-om',
        image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363',
        sort_order: 1,
        is_active: true,
      },
      {
        slug: 'maha-mrityunjaya-jaap',
        title: 'Maha Mrityunjaya Jaap & Havan',
        deity: 'Lord Shiva',
        description:
          'Powerful Vedic chanting of the Maha Mrityunjaya Mantra followed by sacred Havan for healing, recovery from severe health crises, and longevity.',
        significance:
          'Protects against untimely demise (Akaal Mrityu), provides immense vitality, and destroys chronic suffering.',
        default_samagri_list: [
          { item: 'Dry Coconut (Gola)', quantity: '2 pcs' },
          { item: 'Havan Samagri', quantity: '1 kg' },
          { item: 'Mango Wood (Aam ki Lakdi)', quantity: '2 kg' },
          { item: 'Pure Cow Ghee', quantity: '1 kg' },
          { item: 'Black Sesame (Kala Til)', quantity: '250 gm' },
          { item: 'Barley (Jau)', quantity: '250 gm' },
          { item: 'Guggal & Loban', quantity: '100 gm' },
        ],
        suggested_duration_hours: 3.5,
        icon: 'fa-solid fa-fire-flame-curved',
        image_url: 'https://images.unsplash.com/photo-1609358905581-e53825838031',
        sort_order: 2,
        is_active: true,
      },
      {
        slug: 'navagraha-shanti-havan',
        title: 'Navagraha Shanti Havan',
        deity: 'Nine Planets (Navagraha)',
        description:
          'Comprehensive planetary pacification ceremony using dedicated sacred woods (Samidha) for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu.',
        significance:
          'Neutralizes planetary doshas, brings harmony to family life, and removes unexplained blockages in success.',
        default_samagri_list: [
          { item: 'Navagraha Samidha Set', quantity: '1 set' },
          { item: 'Navadhanya (9 Grains)', quantity: '500 gm' },
          { item: 'Navagraha Cloth (9 Colors)', quantity: '1 set' },
          { item: 'Pure Cow Ghee', quantity: '500 gm' },
          { item: 'Havan Kund & Wood', quantity: '1 set' },
        ],
        suggested_duration_hours: 3.0,
        icon: 'fa-solid fa-sun',
        image_url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334',
        sort_order: 3,
        is_active: true,
      },
      {
        slug: 'kaal-sarp-dosh-nivaran',
        title: 'Kaal Sarp Dosh Nivaran Puja',
        deity: 'Lord Shiva & Naga Devata',
        description:
          'Targeted Vedic ritual with silver Nag-Nagin idol consecration to pacify the Rahu-Ketu axis and unlock stuck potential in career and marriage.',
        significance:
          'Removes career stagnation, recurring bad dreams, delays in marriage, and financial volatility.',
        default_samagri_list: [
          { item: 'Silver Nag-Nagin Pair', quantity: '1 pair' },
          { item: 'Kusha Grass Ring', quantity: '2 pcs' },
          { item: 'Milk & Honey', quantity: '500 ml' },
          { item: 'Black Til & Mustard Seeds', quantity: '200 gm' },
          { item: 'Belpatra & Blue Flowers', quantity: '1 set' },
        ],
        suggested_duration_hours: 3.0,
        icon: 'fa-solid fa-shield-halved',
        image_url: 'https://images.unsplash.com/photo-1548625361-195fe5786b36',
        sort_order: 4,
        is_active: true,
      },
      {
        slug: 'satyanarayan-katha',
        title: 'Shri Satyanarayan Vrat Katha & Puja',
        deity: 'Lord Vishnu (Satyanarayan)',
        description:
          'Traditional recitation of the five chapters of Sri Satyanarayan Katha followed by Aarti and distribution of Panjiri Prasad.',
        significance:
          'Brings domestic peace, joy, prosperity, and gratitude on auspicious tithis, birthdays, and anniversaries.',
        default_samagri_list: [
          { item: 'Banana Tree Leaves', quantity: '4 pcs' },
          { item: 'Panjiri Prasad Ingredients', quantity: '500 gm' },
          { item: 'Panchamrit Set', quantity: '1 bowl' },
          { item: 'Tulsi Leaves', quantity: '21 pcs' },
          { item: 'Yellow Cloth & Supari', quantity: '1 set' },
        ],
        suggested_duration_hours: 2.0,
        icon: 'fa-solid fa-book-open-reader',
        image_url: 'https://images.unsplash.com/photo-1512341689857-198e7e2f3ca8',
        sort_order: 5,
        is_active: true,
      },
      {
        slug: 'griha-pravesh-puja',
        title: 'Griha Pravesh & Vastu Shanti Puja',
        deity: 'Lord Ganesha & Vastu Purusha',
        description:
          'Grand home-warming ritual including Dwar Puja, Kalash Yatra, Gau Puja, Vastu Shanti Havan, and threshold consecration.',
        significance:
          'Cleanses residual negative energies from new premises and invites abundance, health, and harmony for dwellers.',
        default_samagri_list: [
          { item: 'Brass Kalash with Coconut', quantity: '1 set' },
          { item: 'Mango Leaves (Aam ke Patte)', quantity: '11 pcs' },
          { item: 'Vastu Yantra', quantity: '1 pc' },
          { item: 'Havan Samagri & Ghee', quantity: '1 kg' },
          { item: 'Gomutra & Gangajal', quantity: '200 ml' },
        ],
        suggested_duration_hours: 4.0,
        icon: 'fa-solid fa-house-chimney',
        image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
        sort_order: 6,
        is_active: true,
      },
      {
        slug: 'lakshmi-kuber-havan',
        title: 'Maha Lakshmi & Kuber Havan',
        deity: 'Goddess Lakshmi & Lord Kuber',
        description:
          'Auspicious Havan offering lotus seeds (Kamalgatta), kheer, and honey with Sri Suktam recitations to attract wealth and clear commercial debts.',
        significance:
          'Bestows financial stability, business prosperity, and eradicates poverty consciousness.',
        default_samagri_list: [
          { item: 'Kamal Gatta (Lotus Seeds)', quantity: '108 pcs' },
          { item: 'Sweet Rice Kheer', quantity: '1 bowl' },
          { item: 'Red Cloth & Sindoor', quantity: '1 set' },
          { item: 'Cow Ghee & Honey', quantity: '500 gm' },
          { item: 'Silver Coin', quantity: '1 pc' },
        ],
        suggested_duration_hours: 2.5,
        icon: 'fa-solid fa-coins',
        image_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843',
        sort_order: 7,
        is_active: true,
      },
      {
        slug: 'baglamukhi-anushthan',
        title: 'Maa Baglamukhi Shatru Vinashak Anushthan',
        deity: 'Maa Baglamukhi',
        description:
          'Tantrik Vedic Anushthan of Pitambara Devi with yellow flowers and turmeric beads for victory in legal cases and protection from malicious adversaries.',
        significance:
          'Stills opponents speech, grants victory in litigation, and shields against evil eye and jealousy.',
        default_samagri_list: [
          { item: 'Turmeric (Haldi) Mala', quantity: '1 pc' },
          { item: 'Yellow Cloth & Flowers', quantity: '1 set' },
          { item: 'Yellow Mustard Seeds (Sarson)', quantity: '250 gm' },
          { item: 'Cow Ghee', quantity: '500 gm' },
        ],
        suggested_duration_hours: 3.0,
        icon: 'fa-solid fa-shield-virus',
        image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119',
        sort_order: 8,
        is_active: true,
      },
      {
        slug: 'sunderkand-paath',
        title: 'Shri Sunderkand & Hanuman Chalisa Paath',
        deity: 'Lord Hanuman',
        description:
          'Melodious recitation of the Sunderkand from Ramcharitmanas invoking Lord Hanumans boundless courage, devotion, and protection.',
        significance:
          'Dispels fear, mental depression, negative energies, and instills tremendous willpower and joy.',
        default_samagri_list: [
          { item: 'Sindoor & Chameli Oil', quantity: '1 set' },
          { item: 'Betel Leaves (Paan) & Janeu', quantity: '2 sets' },
          { item: 'Boondi Prasad & Tulsi', quantity: '500 gm' },
          { item: 'Ghee Lamp (Diya)', quantity: '1 pc' },
        ],
        suggested_duration_hours: 2.5,
        icon: 'fa-solid fa-hand-fist',
        image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d',
        sort_order: 9,
        is_active: true,
      },
      {
        slug: 'pitra-dosh-shanti',
        title: 'Pitra Dosh Shanti & Tarpan',
        deity: 'Pitra Devata & Lord Vishnu',
        description:
          'Sacred ancestral offerings of water, black sesame, and kusha grass with Vishnu Sahasranama to release ancestral karmic bondages.',
        significance:
          'Resolves delays in childbirth, lineage growth, recurrent domestic conflicts, and brings ancestor blessings.',
        default_samagri_list: [
          { item: 'Black Sesame & Barley', quantity: '250 gm' },
          { item: 'Kusha Grass Pavitri', quantity: '2 pcs' },
          { item: 'Gangajal & Milk', quantity: '500 ml' },
          { item: 'White Flowers & Chandan', quantity: '1 set' },
        ],
        suggested_duration_hours: 2.5,
        icon: 'fa-solid fa-hands-praying',
        image_url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88',
        sort_order: 10,
        is_active: true,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const data of rituals) {
      let existing = await repository.findOne({ where: { slug: data.slug } });

      if (existing) {
        Object.assign(existing, data);
        await repository.save(existing);
        updatedCount++;
      } else {
        const created = repository.create(data);
        await repository.save(created);
        createdCount++;
      }
    }

    console.log(
      `[DevotionalRitualSeeder] Finished. Created: ${createdCount}, Updated: ${updatedCount} (Total: ${rituals.length}).`,
    );
  }
}
