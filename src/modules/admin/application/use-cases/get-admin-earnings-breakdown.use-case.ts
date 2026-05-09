import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '@/modules/chat/infrastructure/entities/chat-session.entity';
import { CallSession, CallType } from '@/modules/call/infrastructure/entities/call-session.entity';
import { Order } from '@/modules/order/infrastructure/entities/order.entity';
import { PujaAppointment } from '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity';

@Injectable()
export class GetAdminEarningsBreakdownUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatRepository: Repository<ChatSession>,
    @InjectRepository(CallSession)
    private readonly callRepository: Repository<CallSession>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(PujaAppointment)
    private readonly pujaRepository: Repository<PujaAppointment>,
  ) { }

  async execute(days: number = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // Chat earnings
    const chatStats = await this.chatRepository
      .createQueryBuilder('chat')
      .select("SUM(chat.total_cost)", "total")
      .where('chat.created_at >= :date', { date: dateLimit })
      .andWhere("chat.status = 'completed'")
      .getRawOne();

    // Call earnings (Audio)
    const callStats = await this.callRepository
      .createQueryBuilder('call')
      .select("SUM(call.final_price)", "total")
      .where('call.created_at >= :date', { date: dateLimit })
      .andWhere("call.status = 'completed'")
      .andWhere("call.type = 'audio'")
      .getRawOne();

    // Video earnings 
    const videoStats = await this.callRepository
      .createQueryBuilder('call')
      .select("SUM(call.final_price)", "total")
      .where('call.created_at >= :date', { date: dateLimit })
      .andWhere("call.status = 'completed'")
      .andWhere("call.type = 'video'")
      .getRawOne();

    // Product earnings
    const productStats = await this.orderRepository
      .createQueryBuilder('order')
      .select("SUM(order.total_amount)", "total")
      .where('order.created_at >= :date', { date: dateLimit })
      .andWhere("order.status IN ('paid', 'packed', 'shipped', 'delivered')")
      .getRawOne();

    // Puja earnings
    const pujaStats = await this.pujaRepository
      .createQueryBuilder('puja')
      .select("SUM(puja.price)", "total")
      .where('puja.created_at >= :date', { date: dateLimit })
      .andWhere("puja.status IN ('accepted', 'confirmed')")
      .getRawOne();

    return [
      { name: 'Chat', value: parseFloat(chatStats.total) || 0, color: '#f97316' },
      { name: 'Call', value: parseFloat(callStats.total) || 0, color: '#3b82f6' },
      { name: 'Video Call', value: parseFloat(videoStats.total) || 0, color: '#ec4899' },
      { name: 'Product Selling', value: parseFloat(productStats.total) || 0, color: '#10b981' },
      { name: 'Puja Service', value: parseFloat(pujaStats.total) || 0, color: '#8b5cf6' },
    ];
  }
}
