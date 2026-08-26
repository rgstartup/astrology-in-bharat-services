import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { ClientAccount } from '../entities/account.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class UpdateAccountPictureUseCase {
  private readonly logger = new Logger(UpdateAccountPictureUseCase.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectRepository(ClientAccount)
    private readonly accountRepo: Repository<ClientAccount>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(client: ClientAccount | { id: string }, file: Express.Multer.File) {
    try {
      const result = await this.cloudinaryService.uploadImage(file);
      let pictureUrl: string | null = null;

      if (result.secure_url) {
        pictureUrl = result.secure_url;
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const identifier = client.id;

        let account = await queryRunner.manager.findOne(ClientAccount, {
          where: [{ id: identifier }, { user: { id: identifier } }],
          relations: ['user'],
        });

        if (!account) {
          account = queryRunner.manager.create(ClientAccount, {
            user: { id: identifier } as unknown as User,
            gender: 'other',
          });
          await queryRunner.manager.save(ClientAccount, account);
          account = await queryRunner.manager.findOne(ClientAccount, {
            where: [{ id: identifier }, { user: { id: identifier } }],
            relations: ['user'],
          });
        }

        account!.avatar = pictureUrl || account!.avatar;
        await queryRunner.manager.save(ClientAccount, account!);

        if (account?.user?.id) {
          await queryRunner.manager.update(
            User,
            { id: account.user.id },
            { avatar: pictureUrl },
          );
        }

        await queryRunner.commitTransaction();

        this.eventEmitter.emit('client.account.updated', {
          userId: account?.user?.id || account?.id,
          accountId: account!.id,
          payload: { avatar: pictureUrl },
        });

        return { success: true, avatar: pictureUrl };
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
        `Failed to update profile picture for user ${client.id}: ${err.message}`,
      );
      throw new InternalServerErrorException(
        'Failed to upload profile picture',
      );
    }
  }
}
