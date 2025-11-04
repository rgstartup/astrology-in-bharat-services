// src/auth/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // e.g. "admin", "client", "expert"

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => User, (u) => u.roles)
  users: User[];
}
