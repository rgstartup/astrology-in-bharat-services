import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GetMerchantDetailsUseCase } from '../../application/use-cases/get-merchant-details.use-case';
import { GetAllMerchantsUseCase } from '../../application/use-cases/get-all-merchants.use-case';
import { GetUniqueMerchantCitiesUseCase } from '../../application/use-cases/get-unique-merchant-cities.use-case';
import { OptionalUser } from '@/common/decorators/optional-user.decorator';
import { OptionalJwtAuthGuard } from '@/modules/auth/api/guards/optional-auth.guard';
import { GetPublicMerchantsDto } from '../dto/get-public-merchants.dto';

@Controller({
  path: 'merchants',
  version: '1',
})
export class MerchantPublicController {
  constructor(
    private readonly getMerchantDetails: GetMerchantDetailsUseCase,
    private readonly getAllMerchants: GetAllMerchantsUseCase,
    private readonly getUniqueCities: GetUniqueMerchantCitiesUseCase,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @OptionalUser('id') userId: string,
    @Query() dto: GetPublicMerchantsDto,
  ) {
    return this.getAllMerchants.execute(dto, userId);
  }

  @Get('cities')
  async getCities() {
    return this.getUniqueCities.execute();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser('id') userId?: string,
  ) {
    return this.getMerchantDetails.execute(id, userId);
  }
}
