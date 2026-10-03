import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscribePresenceDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  expertId!: number;
}
