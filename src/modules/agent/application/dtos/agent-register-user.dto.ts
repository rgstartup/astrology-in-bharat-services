import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RegisterUserType {
    CLIENT = 'client',
    EXPERT = 'expert',
}

export class AgentRegisterUserDto {
    @ApiProperty({ example: 'Ramesh Kumar' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 'ramesh@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '9876543210' })
    @IsNotEmpty()
    @IsString()
    phone: string;

    @ApiProperty({ enum: RegisterUserType, example: 'expert', description: 'client or expert' })
    @IsEnum(RegisterUserType)
    userType: RegisterUserType;

    @ApiProperty({ required: false, example: 'Vedic, Numerology' })
    @IsOptional()
    @IsString()
    specialization?: string;
}
