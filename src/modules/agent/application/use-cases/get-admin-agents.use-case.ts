import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AdminFacade } from '@/modules/admin/application/admin.facade';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AgentFacade } from '../agent.facade';

@Injectable()
export class GetAdminAgentsUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    @Inject(forwardRef(() => AdminFacade))
    private readonly adminFacade: AdminFacade,
    @Inject(forwardRef(() => AgentFacade))
    private readonly agentFacade: AgentFacade,
  ) {}

  async execute(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const _skip = (page - 1) * limit;

    const { items: users, total } = await this.usersFacade.findAllByRole(
      'agent',
      params.search,
      page,
      limit,
      params.status,
    );

    // Fetch commission settings
    const settings = await this.adminFacade.getSystemSettings([
      'COMMISION_FROM_CLIENT',
      'COMMISION_FROM_ASTROLOGER',
    ]);
    const getSettingValue = (key: string, defaultValue: number) => {
      const setting = settings.find((s) => s.key === key);
      return setting ? Number(setting.value) : defaultValue;
    };

    const _clientCommPercent = getSettingValue('COMMISION_FROM_CLIENT', 3);
    const _expertCommPercent = getSettingValue('COMMISION_FROM_ASTROLOGER', 3);

    const agentsData = await Promise.all(
      users.map(async (uObj) => {
        const u = uObj as unknown as {
          id: string;
          uid: string;
          name: string;
          email: string;
          avatar: string;
          is_blocked: boolean;
          created_at: Date;
        };
        let totalAgentCommission = 0;

        // Replicating calculation logic from AgentStats using AgentFacade
        const profile = await this.agentFacade.getProfile({
          id: u.id,
          email: u.email || '',
          roles: [],
        });

        if (profile) {
          // Fallback for missing exact calculation if UsersFacade doesn't provide it
          // We will just use the profile's pre-calculated earnings if any
          totalAgentCommission = Number(profile.total_earnings || 0);
        }

        return {
          id: u.id,
          agent_id: u.uid,
          name: u.name,
          email: u.email,
          phone: profile?.phone || null,
          avatar: u.avatar,
          status: u.is_blocked ? 'blocked' : 'active',
          createdAt: u.created_at,
          commission_rate: Number(profile?.commission_rate) || 10.0,
          total_earned: Number(totalAgentCommission.toFixed(2)),
          total_listings: Number(profile?.total_registrations) || 0,
          pending_payout: 0,
          kyc: {
            aadhaar_no: profile?.aadhaar_no,
            pan_no: profile?.pan_no,
            aadhaar_doc: profile?.aadhaar_doc,
            pan_doc: profile?.pan_doc,
          },
          address: {
            address: profile?.address,
            city: profile?.city,
            state: profile?.state,
          },
        };
      }),
    );

    return {
      data: agentsData,
      total,
      page,
      limit,
    };
  }
}
