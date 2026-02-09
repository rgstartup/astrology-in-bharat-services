import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { LiveSessionService } from '../../application/services/live-session.service';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';

@Controller('admin/live-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LiveSessionAdminController {
    constructor(private readonly liveSessionService: LiveSessionService) { }

    @Get()
    async getSessions() {
        // User requirement: "See all active sessions" - implies default view might be active, 
        // but API usually lists all. I'll return all, frontend can filter or I can add query param.
        // For now, I'll return all.
        return this.liveSessionService.getAllSessions();
    }

    @Get(':id/messages')
    async getSessionMessages(@Param('id') id: number) {
        return this.liveSessionService.getSessionMessages(id);
    }
}
