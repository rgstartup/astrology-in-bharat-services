import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class ReadNotificationDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  notificationId!: number;
}

export class SubscribeNotificationDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  profileId!: number;
}
