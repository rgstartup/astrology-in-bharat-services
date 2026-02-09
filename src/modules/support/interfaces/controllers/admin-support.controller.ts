import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SupportService } from '../../application/services/support.service';
import { UpdateDisputeStatusDto } from '../../application/dtos/update-dispute-status.dto';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';

@Controller({
    path: 'admin/support',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSupportController {
    constructor(private readonly supportService: SupportService) { }

    @Get('disputes')
    async getAllDisputes(
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('priority') priority?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        const filters = { status, type, priority };
        return this.supportService.getAllDisputes(filters, page, limit);
    }

    @Get('disputes/stats')
    async getDisputeStats() {
        return this.supportService.getDisputeStats();
    }

    @Get('disputes/:id')
    async getDisputeById(@Param('id') id: number) {
        return this.supportService.getDisputeById(id);
    }

    @Patch('disputes/:id/status')
    async updateDisputeStatus(
        @Param('id') id: number,
        @Body() dto: UpdateDisputeStatusDto,
    ) {
        const dispute = await this.supportService.updateDisputeStatus(id, dto);
        return {
            message: 'Dispute status updated successfully',
            dispute,
        };
    }
}
