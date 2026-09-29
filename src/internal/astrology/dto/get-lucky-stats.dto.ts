import { IsNotEmpty, IsString } from 'class-validator';

export class GetLuckyStatsDto {
  @IsNotEmpty()
  @IsString()
  sign!: string;

  @IsNotEmpty()
  @IsString()
  date!: string;
}
