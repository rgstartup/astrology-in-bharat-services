import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BankAccount } from '../../domain/entities/bank-account.entity';
import { IBankAccountRepository } from '../../domain/repositories/bank-account.repository.interface';
import { IExpertRepository } from '../../domain/repositories/expert.repository.interface';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../dtos/bank-account.dto';

@Injectable()
export class BankAccountsService {
    constructor(
        @Inject(IBankAccountRepository)
        private bankAccountRepository: IBankAccountRepository,
        @Inject(IExpertRepository)
        private expertRepository: IExpertRepository,
    ) { }

    private async getExpertProfile(userId: number) {
        const profile = await this.expertRepository.findByUserId(userId);
        if (!profile) throw new NotFoundException('Expert profile not found');
        return profile;
    }

    async create(userId: number, dto: CreateBankAccountDto) {
        const profile = await this.getExpertProfile(userId);

        // If this is the first account, it must be primary
        const count = await this.bankAccountRepository.countByExpertId(profile.id);
        if (count === 0) {
            dto.is_primary = true;
        }

        if (dto.is_primary) {
            await this.bankAccountRepository.resetPrimaryStatus(profile.id);
        }

        const account = this.bankAccountRepository.create({
            ...dto,
            expertId: profile.id,
        });

        return this.bankAccountRepository.save(account);
    }

    async findAll(userId: number) {
        const profile = await this.getExpertProfile(userId);
        return this.bankAccountRepository.findByExpertId(profile.id);
    }

    async findOne(userId: number, id: number) {
        const profile = await this.getExpertProfile(userId);
        const account = await this.bankAccountRepository.findById(id);

        if (!account || account.expertId !== profile.id) {
            throw new NotFoundException('Bank account not found');
        }
        return account;
    }

    async update(userId: number, id: number, dto: UpdateBankAccountDto) {
        const account = await this.findOne(userId, id);

        if (dto.is_primary && !account.is_primary) {
            await this.bankAccountRepository.resetPrimaryStatus(account.expertId);
        }

        Object.assign(account, dto);
        return this.bankAccountRepository.save(account);
    }

    async setPrimary(userId: number, id: number) {
        const account = await this.findOne(userId, id);

        await this.bankAccountRepository.resetPrimaryStatus(account.expertId);

        account.is_primary = true;
        return this.bankAccountRepository.save(account);
    }

    async remove(userId: number, id: number) {
        const account = await this.findOne(userId, id);

        if (account.is_primary) {
            throw new BadRequestException('Cannot delete primary bank account. Set another account as primary first.');
        }

        await this.bankAccountRepository.remove(account);
        return { message: 'Bank account deleted successfully' };
    }
}
