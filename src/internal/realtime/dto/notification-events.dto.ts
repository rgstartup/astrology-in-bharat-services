import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReadNotificationDto {
  @IsString()
  @IsNotEmpty()
  notificationId!: string;
}

export class SubscribeNotificationDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  profileId!: number;
}
