import { ArrayMinSize, IsArray, IsNumber } from 'class-validator';

export class SyncExpertSpecializationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  specialization_ids!: number[];
}
