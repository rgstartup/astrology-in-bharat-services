import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { PujaAppointment } from '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity';
import { OrderItem } from '@/modules/commerce/order/infrastructure/entities/order-item.entity';
import { Order } from '@/modules/commerce/order/infrastructure/entities/order.entity';

@Injectable()
export class GetAdminTopExpertsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ChatSession)
    private readonly chatRepository: Repository<ChatSession>,
    @InjectRepository(CallSession)
    private readonly callRepository: Repository<CallSession>,
    @InjectRepository(PujaAppointment)
    private readonly pujaRepository: Repository<PujaAppointment>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) { }

  async execute(limit: number = 5) {
    // Rank all experts by their total aggregate revenue
    const profiles = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .innerJoin('user.profile_expert', 'profile')
      .where('role.name = :role', { role: 'expert' })
      .select(['user.id', 'user.name', 'profile.id'])
      .getMany();

    const results = (await Promise.all(profiles.map(async (expert) => {
      if (!expert.profile_expert) return null;
      const expertProfileId = expert.profile_expert.id;

      // 1. Chat Revenue
      const chatStats = await this.chatRepository
        .createQueryBuilder('chat')
        .select("SUM(chat.total_cost)", "total")
        .addSelect("COUNT(chat.id)", "count")
        .where('chat.expert_id = :id AND chat.status = :status', { id: expertProfileId, status: 'completed' })
        .getRawOne();

      // 2. Call Revenue
      const callStats = await this.callRepository
        .createQueryBuilder('call')
        .select("SUM(call.final_price)", "total")
        .addSelect("COUNT(call.id)", "count")
        .where('call.expert_id = :id AND call.status = :status', { id: expertProfileId, status: 'completed' })
        .getRawOne();

      // 3. Puja Revenue
      const pujaStats = await this.pujaRepository
        .createQueryBuilder('puja')
        .select("SUM(puja.price)", "total")
        .addSelect("COUNT(puja.id)", "count")
        .where('puja.expert_id = :id AND puja.status IN (:...statuses)', { 
          id: expertProfileId, 
          statuses: ['accepted', 'confirmed'] 
        })
        .getRawOne();

      // 4. Product Revenue
      const productStats = await this.orderItemRepository
        .createQueryBuilder('item')
        .innerJoin('item.product', 'p')
        .innerJoin('item.order', 'o')
        .select("SUM(item.price * item.quantity)", "total")
        .addSelect("COUNT(item.id)", "count")
        .where('p.expert_id = :id AND o.status IN (:...statuses)', { 
          id: expertProfileId, 
          statuses: ['paid', 'packed', 'shipped', 'delivered'] 
        })
        .getRawOne();

      const totalRevenue = 
        (parseFloat(chatStats.total) || 0) + 
        (parseFloat(callStats.total) || 0) + 
        (parseFloat(pujaStats.total) || 0) + 
        (parseFloat(productStats.total) || 0);

      const totalConsultations = 
        (parseInt(chatStats.count, 10) || 0) + 
        (parseInt(callStats.count, 10) || 0) + 
        (parseInt(pujaStats.count, 10) || 0) + 
        (parseInt(productStats.count, 10) || 0);

      return {
        name: expert.name,
        revenue: totalRevenue,
        consultations: totalConsultations,
        rating: 4.8 // placeholder
      };
    }))).filter(Boolean);

    // Sort by revenue and return limited results
    return results
      .sort((a, b) => b!.revenue - a!.revenue)
      .slice(0, limit);
  }
}
