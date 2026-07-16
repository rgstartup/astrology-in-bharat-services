import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispute,
  DisputeStatus,
} from '../../infrastructure/entities/dispute.entity';
import { CreateDisputeDto } from '../../api/dto/create-dispute.dto';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class CreateDisputeUseCase {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
  ) {}

  async execute(user: IUser, dto: CreateDisputeDto) {
    const isExpert = user.roles.includes(RoleEnum.EXPERT);

    const dispute = this.disputeRepo.create({
      client_id: !isExpert ? user.profile || null : null,
      expert_id: isExpert ? user.profile || null : null,
      type: dto.type,
      category: dto.category,
      description: dto.description,
      status: DisputeStatus.OPEN,
      order_id: dto.orderId,
      item_id: dto.itemId,
      consultation_id: dto.consultationId,
      puja_id: dto.pujaId,
      item_details: dto.itemDetails as Record<string, unknown>,
    });

    return this.disputeRepo.save(dispute);
  }
}
