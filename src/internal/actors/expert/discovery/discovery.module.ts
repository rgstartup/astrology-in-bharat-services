import { Module } from '@nestjs/common';
import { ExpertDiscoveryController } from './controllers/discovery.controller';
import { ExpertDiscoveryService } from './discovery.service';
import { QueryExpertsUseCase } from './use-cases/query-experts.usecase';

@Module({
  controllers: [ExpertDiscoveryController],
  providers: [ExpertDiscoveryService, QueryExpertsUseCase],
  exports: [ExpertDiscoveryService],
})
export class ExpertDiscoveryModule {}
