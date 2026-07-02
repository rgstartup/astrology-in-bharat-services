import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { AgentListing } from '../../infrastructure/entities/agent-listing.entity';

@Injectable()
export class CreateAgentListingUseCase {
  constructor(private readonly databaseService: DatabaseService) {}

  async execute(
    userId: string,
    body: {
      type?: string;
      name?: string;
      location?: string;
      phone?: string;
      deity?: string;
      items?: string;
    },
  ) {
    const allowedTypes = ['mandir', 'puja_shop'];
    if (!body.type || !allowedTypes.includes(body.type)) {
      throw new BadRequestException('type must be "mandir" or "puja_shop"');
    }
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException('name is required');
    }

    const listing = await this.databaseService.transaction(
      async (queryRunner) => {
        const newListing = queryRunner.manager.create(AgentListing, {
          type: body.type,
          name: body.name!.trim(),
          location: body.location?.trim() || null,
          phone: body.phone?.trim() || null,
          deity: body.deity?.trim() || null,
          items: body.items?.trim() || null,
          status: 'pending',
          agent_id: userId,
        });
        return queryRunner.manager.save(AgentListing, newListing);
      },
    );

    return {
      success: true,
      message: `${body.type === 'puja_shop' ? 'Puja Shop' : 'Mandir'} listing created successfully`,
      listing,
    };
  }
}
