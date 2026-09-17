import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ExpertProductsFacade } from '../products.facade';
import { GetExpertProductsDto } from '../dto/get-expert-products.dto';
import { ExpertJwtAuthGuard } from '@/modules/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';

@Controller({
  path: 'expert/products',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertProductsController {
  constructor(private readonly productsFacade: ExpertProductsFacade) {}

  @Get()
  async getExpertProducts(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertProductsDto,
  ) {
    return this.productsFacade.findExpertProducts(expert.sub, dto);
  }

  @Get(':id')
  async getExpertProductById(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsFacade.findExpertProductById(expert.sub, id);
  }
}
