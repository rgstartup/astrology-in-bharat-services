import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralLedgerEntry } from './infrastructure/entities/general-ledger-entry.entity';
import { GetGeneralLedgerUseCase } from './application/use-cases/get-general-ledger.use-case';
import { GeneralLedgerFacade } from './application/general-ledger.facade';
import { GeneralLedgerController } from './api/controllers/general-ledger.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GeneralLedgerEntry])],
  providers: [GetGeneralLedgerUseCase, GeneralLedgerFacade],
  controllers: [GeneralLedgerController],
  exports: [GeneralLedgerFacade],
})
export class GeneralLedgerModule {}
