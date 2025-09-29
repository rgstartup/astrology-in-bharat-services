import { IsIn, IsString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  date_of_birth: string;

  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';
}
