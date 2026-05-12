// src/auth/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Entity({ schema: 'public', name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  name!: string; // e.g. "admin", "client", "expert"

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ManyToMany(() => User, (u) => u.roles)
  users!: User[];
}
