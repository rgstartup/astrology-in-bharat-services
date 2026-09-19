import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaSource } from '../enums/media-source.enum';

/**
 * Entity representing a media asset (image, video, document) stored in the database.
 * Tracks asset location, origin source, Cloudinary public_id, mime type, and dimensions/file sizes.
 */
@Entity({ schema: 'content', name: 'media' })
export class Media {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Full accessible URL of the media asset */
  @Column()
  url!: string;

  /** Origin source of the media (Cloudinary, Google OAuth, Local, etc.) */
  @Column({
    type: 'enum',
    enum: MediaSource,
    default: MediaSource.CLOUDINARY,
  })
  source!: MediaSource;

  /** Cloudinary public_id for asset management, overriding, or deletion */
  @Column({ type: 'varchar', length: 255, nullable: true })
  public_id!: string | null;

  /** MIME type of the file (e.g. image/jpeg, image/png) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type!: string | null;

  /** Descriptive alt text for accessibility and SEO */
  @Column({ type: 'varchar', length: 500, nullable: true })
  alt_text!: string | null;

  /** File size in bytes */
  @Column({ type: 'integer', nullable: true })
  file_size!: number | null;

  /** Original filename when uploaded */
  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name!: string | null;

  /** Timestamp when the media asset was created */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  /** Timestamp when the media asset was last updated */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;

  /** Soft-delete timestamp */
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deleted_at!: Date | null;
}

