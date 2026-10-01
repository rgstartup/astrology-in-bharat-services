import { IsEnum, IsNotEmpty } from 'class-validator';
import { type AvailabilityMode } from '../presence.types';

export class UpdateAvailabilityDto {
  @IsNotEmpty()
  @IsEnum(['available', 'unavailable'], {
    message: "Mode must be either 'available' or 'unavailable'",
  })
  mode!: AvailabilityMode;
}
