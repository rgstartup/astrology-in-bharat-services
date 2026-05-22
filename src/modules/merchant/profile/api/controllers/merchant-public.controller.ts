import { Controller, Get, Param, Query, ParseUUIDPipe, DefaultValuePipe, UseGuards } from '@nestjs/common';
import { GetMerchantDetailsUseCase } from '../../application/use-cases/get-merchant-details.use-case';
import { GetAllMerchantsUseCase } from '../../application/use-cases/get-all-merchants.use-case';
import { GetUniqueMerchantCitiesUseCase } from '../../application/use-cases/get-unique-merchant-cities.use-case';
import { OptionalUser } from '@/common/decorators/optional-user.decorator';
import { OptionalJwtAuthGuard } from '@/modules/auth/api/guards/optional-auth.guard';

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
    @OptionalUser('id') userId?: number,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('page', new DefaultValuePipe(1), ParseUUIDPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseUUIDPipe) limit: number = 10,
  ) {
    return this.getAllMerchants.execute({ search, city, page, limit, currentUserId: userId });
  }

  @Get('cities')
  async getCities() {
    return this.getUniqueCities.execute();
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser('id') userId?: number,
  ) {
    return this.getMerchantDetails.execute(id, userId);
  }
}
