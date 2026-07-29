import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

@Injectable()
export class GetAdminTopExpertsUseCase {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(limit: number = 5) {
    // 1. Fetch top experts aggregated in a single PostgreSQL query
    // E-commerce products are sold by Merchants, not Experts, so we exclude product stats.
    // Assuming transactions have a way to link to expert profile id (often via reference_id linking to a session with expert_id)
    // Here we use a query that mimics the previous logic by fetching from the respective session tables joined directly.
    
    const topExpertsRaw = await this.transactionRepository.manager.query(
      `
      SELECT 
          u.name,
          pe.id as expert_profile_id,
          pe.rating,
          COALESCE(SUM(c.amount), 0) as revenue,
          COUNT(c.id) as consultations
      FROM expert.profile pe
      JOIN public.users u ON u.id = pe.user_id
      LEFT JOIN (
          SELECT expert_id, expert_revenue as amount, id FROM consultations.chat_sessions WHERE status = 'completed'
          UNION ALL
          SELECT expert_id, expert_revenue as amount, id FROM consultations.call_sessions WHERE status = 'completed'
          UNION ALL
          SELECT astrologer_id as expert_id, amount, id FROM puja.appointments WHERE status = 'completed'
      ) c ON c.expert_id = pe.id
      GROUP BY u.name, pe.id, pe.rating
      ORDER BY revenue DESC
      LIMIT $1
      `,
      [limit]
    );

    return topExpertsRaw.map((expert: any) => ({
      name: expert.name,
      revenue: Number(expert.revenue || 0),
      consultations: Number(expert.consultations || 0),
      rating: Number(expert.rating || 4.8), 
    }));
  }
}
