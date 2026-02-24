import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'original_price' })
  original_price: number;

  @Column({ name: 'image_url', nullable: true })
  image_url: string;

  @Column({ default: true, name: 'is_active' })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  percentage_off: number;

  @AfterLoad()
  calculatePercentageOff() {
    const price = Number(this.price);
    const original_price = Number(this.original_price);

    if (original_price && price && original_price > price) {
      const diff = original_price - price;
      this.percentage_off = Math.round((diff / original_price) * 100);
    } else {
      this.percentage_off = 0;
    }
  }
}
