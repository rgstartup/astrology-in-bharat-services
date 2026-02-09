import { Controller, Get, Post, Patch, Param, Body, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DisputeChatService } from '../../application/services/dispute-chat.service';
import { SendMessageDto } from '../../application/dtos/send-message.dto';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { User } from '@/modules/users/domain/entities/user.entity';

@Controller({
    path: 'support',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class DisputeChatController {
    constructor(private readonly chatService: DisputeChatService) { }

    @Get('disputes/:disputeId/messages')
    async getMessages(
        @Param('disputeId') disputeId: number,
        @CurrentUser() user: User,
    ) {
        const messages = await this.chatService.getMessages(disputeId, user);
        return { messages };
    }

    @Post('disputes/:disputeId/messages')
    async sendMessage(
        @Param('disputeId') disputeId: number,
        @CurrentUser() user: User,
        @Body() dto: SendMessageDto,
    ) {
        const message = await this.chatService.sendMessage(disputeId, user, dto);
        return {
            message: 'Message sent successfully',
            data: message,
        };
    }

    @Patch('disputes/:disputeId/messages/read')
    async markAsRead(
        @Param('disputeId') disputeId: number,
        @CurrentUser() user: User,
    ) {
        const count = await this.chatService.markMessagesAsRead(disputeId, user);
        return {
            message: 'Messages marked as read',
            count,
        };
    }

    @Get('disputes/:disputeId/unread-count')
    async getUnreadCount(
        @Param('disputeId') disputeId: number,
        @CurrentUser() user: User,
    ) {
        const count = await this.chatService.getUnreadCount(disputeId, user);
        return { count };
    }

    // Optional: Upload endpoint if needed separately, or frontend handles upload to Cloudinary directly
    // This is a placeholder for file upload if we were to implement it on backend
    /*
    @Post('disputes/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
       // Implement file upload logic here (e.g., to S3 or Cloudinary)
       return { url: '...' };
    }
    */
}
