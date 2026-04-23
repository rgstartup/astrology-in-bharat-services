import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileClient } from '../../infrastructure/persistence/entities/profile-client.entity';
import { UpdateProfileClientDto } from '../../infrastructure/persistence/dto/profile-client.dto';
import { ProfilePolicy } from '../../domain/policies/profile.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileUpdatedEvent } from '../../domain/events/profile-events';
import { Address } from '@/common/address/address.entity';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: number, dto: UpdateProfileClientDto) {
    let profile = await this.repo.findOne({
      where: { user: { id: userId } },
      relations: ['addresses'],
    });

    if (!profile) {
      this.logger.log(`No client profile found for user ${userId}, creating on-the-fly`);
      profile = this.repo.create({ user: { id: userId } as any, gender: 'other' });
      await this.repo.save(profile);
      profile = await this.repo.findOne({
        where: { user: { id: userId } },
        relations: ['addresses'],
      });
    }

    ProfilePolicy.ensureProfileExists(profile);

    this.logger.log(`Updating client profile for user ${userId}`);

    const { addresses, ...scalarFields } = dto as any;

    Object.assign(profile, scalarFields);

    if (addresses !== undefined && Array.isArray(addresses)) {
      if (profile.addresses && profile.addresses.length > 0) {
        await this.addressRepo.remove(profile.addresses);
      }
      profile.addresses = addresses.map((addr: any) =>
        this.addressRepo.create({
          line1: [addr.line1, addr.line2].filter(Boolean).join(', ') || addr.house_no || '',
          house_no: addr.house_no,
          city: addr.city,
          district: addr.district,
          state: addr.state,
          country: addr.country,
          zip_code: addr.zip_code || addr.pincode || '',
          pincode: addr.pincode,
          is_primary: addr.is_primary ?? false,
          tag: addr.tag || 'other',
        }),
      );
    }

    const updatedProfile = await this.repo.save(profile);

    this.eventEmitter.emit(
      'client.profile.updated',
      new ProfileUpdatedEvent(userId, updatedProfile.id, dto),
    );

    return updatedProfile;
  }
}
