import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralLedgerEntry } from './entities/general-ledger-entry.entity';
import { GetGeneralLedgerUseCase } from './use-cases/get-general-ledger.use-case';
import { GeneralLedgerFacade } from './general-ledger.facade';
import { GeneralLedgerController } from './controllers/general-ledger.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GeneralLedgerEntry])],
  providers: [GetGeneralLedgerUseCase, GeneralLedgerFacade],
  controllers: [GeneralLedgerController],
  exports: [GeneralLedgerFacade],
})
export class GeneralLedgerModule {}
