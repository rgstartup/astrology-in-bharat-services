import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileUpdatedEvent } from '../../domain/events/profile-events';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class UpdateProfilePictureUseCase {
  private readonly logger = new Logger(UpdateProfilePictureUseCase.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectRepository(ProfileClient)
    private readonly profileRepo: Repository<ProfileClient>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(user: IUser, file: Express.Multer.File) {
    try {
      // 1. Upload image to Cloudinary
      const result = (await this.cloudinaryService.uploadImage(file)) as {
        secure_url: string;
      };
      const pictureUrl = result.secure_url;

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 2. Find or create profile
        const whereClause = user.profile
          ? { id: user.profile, user: { id: user.id } }
          : { user: { id: user.id } };

        let profile = await queryRunner.manager.findOne(ProfileClient, { where: whereClause });

        if (!profile) {
          profile = queryRunner.manager.create(ProfileClient, {
            user: { id: user.id } as unknown as User,
            gender: 'other',
          });
          await queryRunner.manager.save(ProfileClient, profile);
          profile = await queryRunner.manager.findOne(ProfileClient, { where: whereClause });
        }

        // 3. Update profile_picture on ProfileClient
        profile!.profile_picture = pictureUrl;
        await queryRunner.manager.save(ProfileClient, profile!);

        // 4. Sync avatar on User table
        await queryRunner.manager.update(User, { id: user.id }, { avatar: pictureUrl });

        await queryRunner.commitTransaction();

        // 5. Emit event
        this.eventEmitter.emit(
          'client.profile.updated',
          new ProfileUpdatedEvent(
            user.id,
            profile!.id,
            { profile_picture: pictureUrl },
          ),
        );

        return { success: true };
      } catch (err) {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
        throw err;
      } finally {
        await queryRunner.release();
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to update profile picture for user ${user.id}: ${err.message}`,
      );
      throw new InternalServerErrorException('Failed to upload profile picture');
    }
  }
}
