import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { CreateAgentDto } from '../../api/dto/create-agent.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';

@Injectable()
export class CreateAgentUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(IHasherToken) private readonly hasher: IHasher,
  ) {}

  async execute(
    dto: CreateAgentDto,
    files?: {
      profile_pic?: Express.Multer.File;
      aadhaar_doc?: Express.Multer.File;
      pan_doc?: Express.Multer.File;
    },
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check if user exists
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // 2. Hash password
      const hashedPassword = await this.hasher.hash(dto.password);

      // 4. Create User
      const user = queryRunner.manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        roles: [RoleEnum.AGENT],
        email_verified_at: new Date(), // Admin created users are verified
      });

      // Handle profile pic upload
      if (files?.profile_pic) {
        const uploadResultSecureUrl = await this.uploadFile(files.profile_pic);
        user.avatar = uploadResultSecureUrl;
      }

      const savedUser = await queryRunner.manager.save(User, user);

      // 5. Create ProfileAgent
      const agentProfile = queryRunner.manager.create(ProfileAgent, {
        user_id: savedUser.id,
        uid: this.generateUID(),
        commission_rate: 10.0, // Default fixed rate as requested to remove from UI
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        aadhaar_no: dto.aadhaar_no,
        pan_no: dto.pan_no,
      });

      // Handle document uploads
      if (files?.aadhaar_doc) {
        const uploadResultSecureUrl = await this.uploadFile(files.aadhaar_doc);
        agentProfile.aadhaar_doc = uploadResultSecureUrl;
      }
      if (files?.pan_doc) {
        const uploadResultSecureUrl = await this.uploadFile(files.pan_doc);
        agentProfile.pan_doc = uploadResultSecureUrl;
      }

      await queryRunner.manager.save(ProfileAgent, agentProfile);

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Agent created successfully',
        agent: {
          id: savedUser.id,
          uid: agentProfile.uid,
          email: savedUser.email,
          name: savedUser.name,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generateUID() {
    const suffix = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);
    return `AIB-AGT-${suffix}`;
  }

  private async uploadFile(file: Express.Multer.File): Promise<string> {
    const result = (await this.cloudinaryService.uploadImage(file)) as Record<
      string,
      unknown
    >;
    return result.secure_url as string;
  }
}
