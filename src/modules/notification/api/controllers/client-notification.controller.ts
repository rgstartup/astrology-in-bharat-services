import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { Controller, UseGuards } from '@nestjs/common';

@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationController {}
