import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/entities/expert-puja.entity';
import { ProfileExpert } from '../../../infrastructure/entities/profile-expert.entity';
import { IUser } from '@/common/types/access-token.payload';
import { ExpertPujaDto } from '../../../api/dto/expert-puja.dto';
import { GetProfileUseCase } from '../get-profile.usecase';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import sharp from 'sharp';

// Required image specs
const REQUIRED_RATIO = 16 / 9;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;
const RATIO_TOLERANCE = 0.05; // 5% tolerance

@Injectable()
export class UpsertPujaUseCase {
  private readonly logger = new Logger(UpsertPujaUseCase.name);

  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepo: Repository<ExpertPuja>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async validateImageDimensions(base64: string): Promise<void> {
    // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(base64Data, 'base64');

    const metadata = await sharp(buffer).metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new BadRequestException('Could not read image dimensions.');
    }

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      throw new BadRequestException(
        `Puja image is too small. Minimum size is ${MIN_WIDTH}×${MIN_HEIGHT}px. Your image is ${width}×${height}px.`,
      );
    }

    const ratio = width / height;
    if (Math.abs(ratio - REQUIRED_RATIO) > RATIO_TOLERANCE) {
      throw new BadRequestException(
        `Puja image must be in 16:9 ratio (e.g., 1280×720, 1920×1080). Your image ratio is ${width}:${height}.`,
      );
    }
  }

  async execute(user: IUser, dto: ExpertPujaDto, id?: string) {
    const where = user.profile
      ? { id: user.profile, user: { id: user.id } }
      : { user: { id: user.id } };
    const profile = await this.profileRepo.findOne({ where });

    if (!profile) {
      throw new NotFoundException('Expert profile not found');
    }

    let puja: ExpertPuja;

    if (id) {
      const existing = await this.pujaRepo.findOne({
        where: { id, expert_id: profile.id },
      });
      if (!existing) {
        throw new NotFoundException('Puja service not found');
      }
      puja = existing;
    } else {
      puja = this.pujaRepo.create({
        expert_id: profile.id,
      });
    }

    if (dto.puja_image) {
      // Validate image dimensions before uploading
      await this.validateImageDimensions(dto.puja_image);

      try {
        const uploadResult = (await this.cloudinaryService.uploadBase64(
          dto.puja_image,
          'pujas',
        )) as Record<string, unknown>;
        puja.puja_image_url = uploadResult.secure_url as string;
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.error('Failed to upload puja image:', error);
      }
    }

    puja.is_online = dto.is_online ?? false;
    puja.is_home_visit = dto.is_home_visit ?? false;
    puja.name = dto.name;
    puja.min_duration_hours = dto.min_duration_hours;
    puja.max_duration_hours = dto.max_duration_hours;
    puja.online_cost = dto.online_cost ?? 0;
    puja.home_visit_with_samagri_cost = dto.home_visit_with_samagri_cost ?? 0;
    puja.home_visit_without_samagri_cost =
      dto.home_visit_without_samagri_cost ?? 0;
    puja.description = dto.description ?? null;
    puja.districts = puja.is_home_visit ? (dto.districts ?? []) : null;
    puja.samagri_list = dto.samagri_list ?? [];

    await this.pujaRepo.save(puja);

    return this.getProfileUseCase.execute(user);
  }
}
