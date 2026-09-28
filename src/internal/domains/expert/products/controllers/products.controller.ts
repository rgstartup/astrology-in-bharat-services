import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ExpertProductsService } from '../products.service';
import { GetExpertProductsDto } from '../dto/get-expert-products.dto';
import { ExpertJwtAuthGuard } from '@/internal/domains/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/internal/domains/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/shared/types/access-token.payload';

@Controller({
  path: 'expert/products',
  version: '1',
})
// @UseGuards(ExpertJwtAuthGuard)
export class ExpertProductsController {
  constructor(private readonly productsService: ExpertProductsService) {}

  @Get()
  async getExpertProducts(@Query() dto: GetExpertProductsDto) {
    return this.productsService.findExpertProducts(dto);
  }

  @Get('/:expert_id/:id')
  async getExpertProductById(
    @Param('expert_id', ParseIntPipe) expert_id: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findExpertProductById(expert_id, id);
  }
}
