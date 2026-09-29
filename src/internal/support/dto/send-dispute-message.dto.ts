import { IsNotEmpty, IsString } from 'class-validator';

export class SendDisputeMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}
