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

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    originalPrice: number;

    @Column()
    imageUrl: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    percentageOff: number;

    @AfterLoad()
    calculatePercentageOff() {
        const price = Number(this.price);
        const originalPrice = Number(this.originalPrice);

        if (originalPrice && price && originalPrice > price) {
            const diff = originalPrice - price;
            this.percentageOff = Math.round((diff / originalPrice) * 100);
        } else {
            this.percentageOff = 0;
        }
    }
}
