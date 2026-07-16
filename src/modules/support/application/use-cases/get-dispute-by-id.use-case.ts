import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../../infrastructure/entities/dispute.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class GetDisputeByIdUseCase {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
  ) {}

  async execute(profileId: string, disputeId: string, isAdmin = false) {
    const query = this.disputeRepo
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.client', 'client')
      .leftJoinAndSelect('client.user', 'clientUser')
      .leftJoinAndSelect('dispute.expert', 'expert')
      .leftJoinAndSelect('expert.user', 'expertUser')
      .leftJoinAndSelect('dispute.consultation', 'consultation')
      .leftJoinAndSelect('consultation.expert', 'consultationExpert')
      .leftJoinAndSelect('consultationExpert.user', 'consultationExpertUser')
      .leftJoinAndSelect('dispute.order', 'order')
      .leftJoinAndSelect('order.items', 'orderItems')
      .leftJoinAndSelect('orderItems.product', 'product')
      .leftJoinAndMapOne(
        'product.merchant',
        ProfileMerchant,
        'merchant',
        'merchant.user_id = product.merchant_id'
      )
      .leftJoinAndMapOne(
        'merchant.user',
        User,
        'merchantUser',
        'merchantUser.id = merchant.user_id'
      )
      .leftJoinAndSelect('dispute.puja', 'puja')
      .leftJoinAndSelect('puja.expert', 'pujaExpert')
      .leftJoinAndSelect('pujaExpert.user', 'pujaExpertUser')
      .where('dispute.id = :disputeId', { disputeId });

    if (!isAdmin) {
      query.andWhere(
        '(dispute.client_id = :profileId OR dispute.expert_id = :profileId)',
        {
          profileId,
        },
      );
    }

    const dispute = await query.getOne();

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }

    return dispute;
  }
}
