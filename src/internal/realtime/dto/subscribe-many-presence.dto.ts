import { ArrayMaxSize, IsArray, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscribeManyPresenceDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  expertIds!: number[];
}
