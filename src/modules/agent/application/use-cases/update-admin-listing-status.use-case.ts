
import { Injectable, NotFoundException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentListing } from '@/modules/agent/infrastructure/entities/agent-listing.entity';

@Injectable()
export class UpdateAdminListingStatusUseCase {
  constructor(
    @InjectRepository(AgentListing)
    private readonly listingRepository: Repository<AgentListing>,
  ) {}

  async execute(id: string, data: { status: string }) {
    const stringId = String(id);
    const listing = await this.listingRepository.findOne({ where: { id: stringId } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Mapping 'active' to 'approved' if necessary (frontend might send 'active' for merchants)
    let newStatus = data.status.toLowerCase();
    if (newStatus === 'active') newStatus = 'approved';

    listing.status = newStatus;
    
    await this.listingRepository.save(listing);

    return new BooleanMessage(true, `Listing status updated to ${newStatus} successfully`);
  }
}
