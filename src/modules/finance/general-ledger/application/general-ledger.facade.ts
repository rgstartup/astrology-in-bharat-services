import { Injectable } from '@nestjs/common';
import {
  GeneralLedgerEventType,
  GeneralLedgerEntryType,
  GeneralLedgerPartyType,
} from '../infrastructure/entities/general-ledger-entry.entity';
import {
  GetGeneralLedgerUseCase,
  QueryGeneralLedgerDto,
} from './use-cases/get-general-ledger.use-case';

export {
  GeneralLedgerEventType,
  GeneralLedgerEntryType,
  GeneralLedgerPartyType,
  QueryGeneralLedgerDto,
};

@Injectable()
export class GeneralLedgerFacade {
  constructor(
    private readonly getGeneralLedgerUseCase: GetGeneralLedgerUseCase,
  ) {}

  query(dto: QueryGeneralLedgerDto = {}) {
    return this.getGeneralLedgerUseCase.execute(dto);
  }
}
