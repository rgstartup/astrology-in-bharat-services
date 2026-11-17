import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class RemovePayoutAccountDto {
  @IsInt()
  @Type(() => Number)
  payoutAccountId: number;
}

export class SetPrimaryPayoutAccountDto {
  @IsInt()
  @Type(() => Number)
  payoutAccountId: number;
}
