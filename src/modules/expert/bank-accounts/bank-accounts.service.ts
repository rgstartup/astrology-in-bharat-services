import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { ProfileExpert } from '../profile/entities/profile-expert.entity';

@Injectable()
export class BankAccountsService {
    constructor(
        @InjectRepository(BankAccount)
        private bankAccountRepo: Repository<BankAccount>,
        @InjectRepository(ProfileExpert)
        private profileRepo: Repository<ProfileExpert>,
    ) { }

    private async getExpertProfile(userId: number) {
        const profile = await this.profileRepo.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('Expert profile not found');
        return profile;
    }

    async create(userId: number, dto: CreateBankAccountDto) {
        const profile = await this.getExpertProfile(userId);

        // If this is the first account, it must be primary
        const count = await this.bankAccountRepo.count({ where: { expertId: profile.id } });
        if (count === 0) {
            dto.is_primary = true;
        }

        if (dto.is_primary) {
            await this.bankAccountRepo.update({ expertId: profile.id }, { is_primary: false });
        }

        const account = this.bankAccountRepo.create({
            ...dto,
            expertId: profile.id,
        });

        return this.bankAccountRepo.save(account);
    }

    async findAll(userId: number) {
        const profile = await this.getExpertProfile(userId);
        return this.bankAccountRepo.find({
            where: { expertId: profile.id },
            order: { is_primary: 'DESC', createdAt: 'DESC' },
        });
    }

    async findOne(userId: number, id: number) {
        const profile = await this.getExpertProfile(userId);
        const account = await this.bankAccountRepo.findOne({
            where: { id, expertId: profile.id },
        });
        if (!account) throw new NotFoundException('Bank account not found');
        return account;
    }

    async update(userId: number, id: number, dto: UpdateBankAccountDto) {
        const account = await this.findOne(userId, id);

        if (dto.is_primary && !account.is_primary) {
            await this.bankAccountRepo.update({ expertId: account.expertId }, { is_primary: false });
        }

        Object.assign(account, dto);
        return this.bankAccountRepo.save(account);
    }

    async setPrimary(userId: number, id: number) {
        const account = await this.findOne(userId, id);

        await this.bankAccountRepo.update({ expertId: account.expertId }, { is_primary: false });

        account.is_primary = true;
        return this.bankAccountRepo.save(account);
    }

    async remove(userId: number, id: number) {
        const account = await this.findOne(userId, id);

        if (account.is_primary) {
            throw new BadRequestException('Cannot delete primary bank account. Set another account as primary first.');
        }

        await this.bankAccountRepo.remove(account);
        return { message: 'Bank account deleted successfully' };
    }
}
