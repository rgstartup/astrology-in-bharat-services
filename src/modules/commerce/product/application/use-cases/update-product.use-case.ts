import { Injectable } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../infrastructure/entities/product.entity';
import { UpdateProductDto } from '../../api/dto/update-product.dto';
import { ProductNotFoundError } from '../../domain/errors/product.errors';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(id: string, dto: UpdateProductDto): Promise<BooleanMessage> {
    const existing = await this.productRepository.findOneBy({ id });
    if (!existing) {
      throw new ProductNotFoundError(id);
    }

    // Build update payload mapping DTO fields to entity columns safely
    const updatePayload: Partial<Product> = {};

    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.price !== undefined) updatePayload.price = dto.price;
    if (dto.original_price !== undefined) updatePayload.original_price = dto.original_price;
    if (dto.stock !== undefined) updatePayload.stock = dto.stock;
    if (dto.category !== undefined) updatePayload.category = dto.category;
    // 'status' from frontend ('active'/'draft') maps to is_active boolean on the entity
    if (dto.status !== undefined) updatePayload.is_active = dto.status === 'active';
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;
    if (dto.gallery !== undefined) updatePayload.gallery = dto.gallery;
    if (dto.short_description !== undefined) updatePayload.short_description = dto.short_description;
    if (dto.is_shipping_chargeable !== undefined) updatePayload.is_shipping_chargeable = dto.is_shipping_chargeable;
    if (dto.shipping_charge !== undefined) updatePayload.shipping_charge = dto.shipping_charge;

    // imageUrl from frontend maps to image_url in entity
    const imageUrl = (dto as any).imageUrl || dto.image_url;
    if (imageUrl !== undefined) updatePayload.image_url = imageUrl;

    await this.productRepository.update(id, updatePayload);
    return new BooleanMessage();
  }
}
