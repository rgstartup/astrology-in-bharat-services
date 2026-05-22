// @ts-nocheck
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { CreateAgentDto } from '../../api/dto/create-agent.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';

@Injectable()
export class CreateAgentUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
      const hashedPassword = await argon2.hash(dto.password);


      // 4. Create User
      const user = queryRunner.manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        roles: [RoleEnum.AGENT],
        email_verified_at: new Date(), // Admin created users are verified
      });

      // Generate UID
      const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      user.uid = `AIB-AGT-${suffix}`;

      // Handle profile pic upload
      if (files?.profile_pic) {
        const uploadResult = await this.cloudinaryService.uploadImage(files.profile_pic);
        user.avatar = uploadResult.secure_url;
      }

      const savedUser = await queryRunner.manager.save(User, user);

      // 5. Create ProfileAgent
      const agentProfile = queryRunner.manager.create(ProfileAgent, {
        user_id: savedUser.id,
        commission_rate: 10.00, // Default fixed rate as requested to remove from UI
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        aadhaar_no: dto.aadhaar_no,
        pan_no: dto.pan_no,
      });

      // Handle document uploads
      if (files?.aadhaar_doc) {
        const uploadResult = await this.cloudinaryService.uploadImage(files.aadhaar_doc);
        agentProfile.aadhaar_doc = uploadResult.secure_url;
      }
      if (files?.pan_doc) {
        const uploadResult = await this.cloudinaryService.uploadImage(files.pan_doc);
        agentProfile.pan_doc = uploadResult.secure_url;
      }

      await queryRunner.manager.save(ProfileAgent, agentProfile);

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Agent created successfully',
        agent: {
          id: savedUser.id,
          uid: savedUser.uid,
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
}


