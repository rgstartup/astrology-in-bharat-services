import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../../infrastructure/entities/bank-account.entity';
import { CreateBankAccountDto } from '../../api/dto/bank-account.dto';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BankAccountCreatedEvent } from '../../domain/events/bank-account-events';

@Injectable()
export class CreateBankAccountUseCase {
  private readonly logger = new Logger(CreateBankAccountUseCase.name);
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(expertProfileId: string, dto: CreateBankAccountDto) {
    this.logger.log(`Starting bank account creation for expert profile ${expertProfileId}`);
    this.logger.debug(`Incoming DTO: ${JSON.stringify(dto)}`);

    try {
      const profile = await this.profileRepo.findOne({ where: { id: expertProfileId } });
      if (!profile) throw new NotFoundException('Expert profile not found');
      this.logger.log(`Found expert profile ID ${profile.id}`);

      // If this is the first account, it must be primary
      const count = await this.bankAccountRepo.count({
        where: { expert_id: profile.id },
      });
      if (count === 0) {
        dto.is_primary = true;
      }

      if (dto.is_primary) {
        await this.bankAccountRepo.update(
          { expert_id: profile.id },
          { is_primary: false },
        );
      }

      const account = this.bankAccountRepo.create({
        ...dto,
        expert_id: profile.id,
      });

      const savedAccount = await this.bankAccountRepo.save(account);
      this.logger.log(`Successfully saved bank account ID ${savedAccount.id}`);

      // Emit event
      this.eventEmitter.emit(
        'expert.bank-account.created',
        new BankAccountCreatedEvent(
          profile.user_id,
          savedAccount.id,
          savedAccount.account_holder_name,
        ),
      );

      return savedAccount;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create bank account: ${(error as Error).message}`,
        (error as Error).stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Bank Account Error: ${(error as Error).message}`,
      );
    }
  }
}
