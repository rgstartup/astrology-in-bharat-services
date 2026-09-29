import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ExpertProductsService } from '../products.service';
import { GetExpertProductsDto } from '../dto/get-expert-products.dto';

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
