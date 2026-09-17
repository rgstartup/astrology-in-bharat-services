import { PickType } from '@nestjs/mapped-types';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import TrimString from '@/common/decorators/transform/trim.transform';
import ToBoolean from '@/common/decorators/transform/bool.transform';
import { ProductType } from '@/modules/commerce/product/enum/product-type.enum';
import { ProductGroup } from '@/modules/commerce/product/enum/product-group.enum';
import { ExpertProductRelationType } from '../enum/expert-product-relation-type.enum';

export class GetExpertProductsDto extends PickType(PaginationDto, [
  'page',
  'limit',
  'offset',
  'skip',
]) {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsEnum(ProductGroup)
  product_group?: ProductGroup;

  @IsOptional()
  @IsEnum(ExpertProductRelationType)
  relation_type?: ExpertProductRelationType;

  @IsOptional()
  @IsString()
  @TrimString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  sort_by?: 'created_at' | 'price' | 'name';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
