import { BaseDto } from '@/common/dto/base.dto';
import { MerchantStatus } from '../../entities/account.entity';

export class MerchantAccountResponseDto extends BaseDto {
  id!: string;
  name!: string | null;
  email!: string | null;
  avatar!: string | null;
  shop_name!: string | null;
  manager_name!: string | null;
  phone!: string | null;
  address!: string | null;
  city!: string | null;
  pincode!: string | null;
  image!: string | null;
  video!: string | null;
  status!: MerchantStatus;
  rating!: number;
  review_count!: number;
  established!: string | null;
  description!: string | null;
  is_trusted!: boolean;
  gallery!: string[] | null;
  features!: string[] | null;
  is_online!: boolean;
  operational_hours!: string | null;
  trust_score!: string | null;
  latitude!: number | null;
  longitude!: number | null;
  created_at!: Date;
  updated_at!: Date;
}
