import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SupportService } from '../../application/services/support.service';
import { CreateDisputeDto } from '../../application/dtos/create-dispute.dto';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { User } from '@/modules/users/domain/entities/user.entity';

@Controller({
    path: 'support',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Post('disputes')
    async createDispute(
        @CurrentUser() user: User,
        @Body() dto: CreateDisputeDto,
    ) {
        const dispute = await this.supportService.createDispute(user.id, dto);
        return {
            message: 'Issue reported successfully!',
            dispute,
        };
    }
}
