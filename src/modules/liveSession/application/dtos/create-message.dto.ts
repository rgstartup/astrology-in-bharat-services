import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
    @IsNumber()
    @IsNotEmpty()
    sessionId: number;

    @IsNumber()
    @IsNotEmpty()
    senderId: number;

    @IsString()
    @IsNotEmpty()
    message: string;
}
