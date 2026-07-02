import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SupportFacade } from '../../application/support.facade';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { SendDisputeMessageDto } from '../dto/send-dispute-message.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { IUser } from '@/common/types/access-token.payload';

@Controller({
  path: 'support',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportFacade: SupportFacade) {}

  @Get('disputes')
  async getDisputes(@CurrentProfile() profileId: string) {
    return this.supportFacade.getDisputes(profileId);
  }

  @Get('disputes/:id')
  async getDisputeById(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.supportFacade.getDisputeById(profileId, id);
  }

  @Post('disputes')
  async createDispute(
    @CurrentUser() user: IUser,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.supportFacade.createDispute(user, dto);
  }

  @Get('disputes/:id/messages')
  async getMessages(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.supportFacade.getMessages(profileId, id);
  }

  @Post('disputes/:id/messages')
  async sendMessage(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDisputeMessageDto,
  ) {
    return this.supportFacade.sendMessage(profileId, id, dto);
  }

  @Patch('disputes/:id/messages/read')
  async markMessagesAsRead(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.supportFacade.markMessagesAsRead(profileId, id);
    if (
      result &&
      typeof result === 'object' &&
      result.success &&
      'data' in result
    ) {
      const resultRecord = result as Record<string, unknown>;
      const { data: _data, ...rest } = resultRecord;
      return rest;
    }
    return result;
  }
}
