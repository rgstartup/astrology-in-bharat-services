import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuoteDto {
  @ApiProperty({ example: 'Astrology is the eye of the Vedas.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'Sage Parasara', required: false })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiProperty({ example: 'Brihat Parasara Hora Shastra', required: false })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    example: 'Astrology is essential for understanding Vedas.',
    required: false,
  })
  @IsString()
  @IsOptional()
  meaning?: string;
}
