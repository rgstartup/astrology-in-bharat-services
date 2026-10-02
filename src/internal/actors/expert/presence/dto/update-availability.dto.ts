import { IsEnum, IsNotEmpty } from 'class-validator';
import { AvailabilityMode } from '@/core/enums';

export class UpdateAvailabilityDto {
  @IsNotEmpty()
  @IsEnum(AvailabilityMode, {
    message: "Mode must be either 'available' or 'unavailable'",
  })
  mode!: AvailabilityMode;
}
