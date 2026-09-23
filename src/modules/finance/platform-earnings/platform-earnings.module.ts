import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformFeePolicy } from './entities/platform-fee-policy.entity';
import { PlatformEarning } from './entities/platform-earning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformFeePolicy, PlatformEarning])],
  exports: [TypeOrmModule],
})
export class PlatformEarningsModule {}
