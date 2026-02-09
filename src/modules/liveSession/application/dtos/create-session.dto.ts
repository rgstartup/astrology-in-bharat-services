import { IsEnum, IsNumber, IsNotEmpty } from 'class-validator';
import { LiveSessionType } from '../../domain/enums/session-type.enum';

export class CreateSessionDto {
    @IsNumber()
    @IsNotEmpty()
    userId: number;

    @IsNumber()
    @IsNotEmpty()
    astrologerId: number;

    @IsEnum(LiveSessionType)
    @IsNotEmpty()
    type: LiveSessionType;
}
