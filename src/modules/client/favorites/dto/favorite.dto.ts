import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteItemType } from '../enum/favorite-type.enum';

export class AddFavoriteDto {
  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  clientId?: number;

  @ApiProperty({ description: 'Favorite Item ID' })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  item_id!: number;

  @ApiProperty({ enum: FavoriteItemType, description: 'Type of favorite item' })
  @IsNotEmpty()
  @IsEnum(FavoriteItemType)
  item_type!: FavoriteItemType;
}

export class RemoveFavoriteDto {
  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  clientId?: number;

  @ApiPropertyOptional({ description: 'Favorite ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id?: number;

  @ApiPropertyOptional({ description: 'Item ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  item_id?: number;

  @ApiPropertyOptional({
    enum: FavoriteItemType,
    description: 'Type of favorite item',
  })
  @IsOptional()
  @IsEnum(FavoriteItemType)
  item_type?: FavoriteItemType;
}

export class AddExpertFavoriteDto {
  @ApiProperty({ description: 'Expert ID to add to favorites' })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  expert_id!: number;
}
