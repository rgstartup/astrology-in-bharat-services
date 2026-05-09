import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentListing } from '@/modules/agent/infrastructure/entities/agent-listing.entity';

@Injectable()
export class UpdateListingStatusAdminUseCase {
  constructor(
    @InjectRepository(AgentListing)
    private readonly listingRepository: Repository<AgentListing>,
  ) {}

  async execute(id: string | number, data: { status: string }) {
    const stringId = String(id);
    const numericId = stringId.startsWith('listing-') 
      ? parseInt(stringId.replace('listing-', ''), 10) 
      : parseInt(stringId, 10);

    if (isNaN(numericId)) {
      throw new NotFoundException('Invalid listing ID format');
    }

    const listing = await this.listingRepository.findOne({ where: { id: numericId } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Mapping 'active' to 'approved' if necessary (frontend might send 'active' for merchants)
    let newStatus = data.status.toLowerCase();
    if (newStatus === 'active') newStatus = 'approved';

    listing.status = newStatus;
    
    await this.listingRepository.save(listing);

    return {
      success: true,
      message: `Listing status updated to ${newStatus} successfully`,
      data: listing,
    };
  }
}
