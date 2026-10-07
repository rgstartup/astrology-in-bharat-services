import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClientJwtAuthGuard } from '@/internal/actors/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/actors/client/auth/decorators/current-client.decorator';
import { ClientChatService } from '../chat.service';
import { InitiateChatDto } from '../dto/initiate-chat.dto';
import { InitiateChatResponseDto } from '../dto/initiate-chat-response.dto';

@Controller({
  path: 'client/chat',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientChatController {
  constructor(private readonly clientChatService: ClientChatService) {}

  @Post('initiate')
  async initiateChat(
    @CurrentClient('id') clientId: number,
    @Body() dto: InitiateChatDto,
  ): Promise<InitiateChatResponseDto> {
    const session = await this.clientChatService.initiateChat(
      clientId,
      dto.expert_id,
      dto?.consultation_id,
    );

    return session;
  }
}
