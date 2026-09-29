import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SupportService } from '../support.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { SendDisputeMessageDto } from '../dto/send-dispute-message.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { CurrentProfile } from '../../../shared/decorators/current-profile.decorator';
import { type IUser } from '../../../shared/types/access-token.payload';

@Controller({
  path: 'support',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('disputes')
  async getDisputes(@CurrentProfile() profileId: number) {
    return this.supportService.getDisputes(profileId);
  }

  @Get('disputes/:id')
  async getDisputeById(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.supportService.getDisputeById(profileId, id);
  }

  @Post('disputes')
  async createDispute(
    @CurrentUser() user: IUser,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.supportService.createDispute(user, dto);
  }

  @Get('disputes/:id/messages')
  async getMessages(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.supportService.getMessages(profileId, id);
  }

  @Post('disputes/:id/messages')
  async sendMessage(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendDisputeMessageDto,
  ) {
    return this.supportService.sendMessage(profileId, id, dto);
  }

  @Patch('disputes/:id/messages/read')
  async markMessagesAsRead(
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.supportService.markMessagesAsRead(profileId, id);
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
