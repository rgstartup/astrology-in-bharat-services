import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AgentLoginDto {
    @ApiProperty({ example: 'agent@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'secure_password' })
    @IsString()
    @MinLength(6)
    password: string;
}
