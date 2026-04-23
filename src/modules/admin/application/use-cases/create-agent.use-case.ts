import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { AgentProfile } from '@/modules/agent/infrastructure/persistence/entities/agent-profile.entity';
import { CreateAgentDto } from '../../presentation/dto/create-agent.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';


@Injectable()
export class CreateAgentUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AgentProfile)
    private readonly agentProfileRepository: Repository<AgentProfile>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async execute(
    dto: CreateAgentDto,
    files?: {
      profile_pic?: Express.Multer.File;
      aadhaar_doc?: Express.Multer.File;
      pan_doc?: Express.Multer.File;
    },
  ) {
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    let avatarUrl: string | undefined;

    if (files?.profile_pic) {
      const uploadResult = await this.cloudinaryService.uploadImage(files.profile_pic);
      avatarUrl = uploadResult.secure_url;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, {
        better_auth_user_id: dto.better_auth_user_id,
        email: dto.email,
        name: dto.name,
        role: 'agent',
        uid: `AIB-AGT-${suffix}`,
        avatar: avatarUrl,
      });

      const savedUser = await queryRunner.manager.save(User, user);

      let aadhaarDocUrl: string | undefined;
      let panDocUrl: string | undefined;

      if (files?.aadhaar_doc) {
        const r = await this.cloudinaryService.uploadImage(files.aadhaar_doc);
        aadhaarDocUrl = r.secure_url;
      }
      if (files?.pan_doc) {
        const r = await this.cloudinaryService.uploadImage(files.pan_doc);
        panDocUrl = r.secure_url;
      }

      const agentProfile = queryRunner.manager.create(AgentProfile, {
        user_id: savedUser.id,
        commission_rate: 10.0,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        aadhaar_no: dto.aadhaar_no,
        pan_no: dto.pan_no,
        aadhaar_doc: aadhaarDocUrl,
        pan_doc: panDocUrl,
      });

      await queryRunner.manager.save(AgentProfile, agentProfile);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Agent created successfully',
        agent: { id: savedUser.id, uid: savedUser.uid, email: savedUser.email, name: savedUser.name },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
