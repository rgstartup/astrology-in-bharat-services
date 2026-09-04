import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IExpert } from '@/common/types/access-token.payload';
import { ExpertKycStatus } from '../../shared/enums/kyc-status.enum';
import { ExpertAccount } from '../entities/account.entity';

@Injectable()
export class UpdateExpertAccountStatusUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  async execute(expert: IExpert, isAvailable: boolean) {
    const account = await this.accounts.findOneBy({ id: expert.sub });
    if (!account) throw new NotFoundException('Expert account not found');
    if (isAvailable && account.kyc_status !== ExpertKycStatus.APPROVED) {
      throw new ForbiddenException(
        'Your account is inactive. You cannot go online.',
      );
    }
    account.is_available = isAvailable;
    return this.accounts.save(account);
  }

  async updateKyc(id: string, status: ExpertKycStatus, reason?: string) {
    const account = await this.accounts.findOneBy({ id });
    if (!account) throw new NotFoundException('Expert account not found');
    account.kyc_status = status;
    account.rejection_reason = reason ?? null;
    return this.accounts.save(account);
  }
}
