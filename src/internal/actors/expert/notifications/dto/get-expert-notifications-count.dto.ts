import { IsBoolean, IsOptional } from "class-validator";

export class GetExpertNotificationsCountDto {
  @IsOptional()
  @IsBoolean()
  is_read: boolean = true;
}
