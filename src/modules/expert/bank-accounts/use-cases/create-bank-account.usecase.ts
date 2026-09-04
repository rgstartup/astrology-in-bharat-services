import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankAccountDto } from '../dto/bank-account.dto';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BankAccountCreatedEvent } from '../events/bank-account-events';

@Injectable()
export class CreateBankAccountUseCase {
  private readonly logger = new Logger(CreateBankAccountUseCase.name);
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(ExpertAccount)
    private readonly accountRepo: Repository<ExpertAccount>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(expertAccountId: string, dto: CreateBankAccountDto) {
    this.logger.log(
      `Starting bank account creation for expert account ${expertAccountId}`,
    );
    this.logger.debug(`Incoming DTO: ${JSON.stringify(dto)}`);

    try {
      const expert = await this.accountRepo.findOne({
        where: { id: expertAccountId },
      });
      if (!expert) throw new NotFoundException('Expert account not found');
      this.logger.log(`Found expert account ID ${expert.id}`);

      // If this is the first account, it must be primary
      const count = await this.bankAccountRepo.count({
        where: { expert: { id: expert.id } },
      });
      if (count === 0) {
        dto.is_primary = true;
      }

      if (dto.is_primary) {
        await this.bankAccountRepo
          .createQueryBuilder()
          .update(BankAccount)
          .set({ is_primary: false })
          .where('expert_id = :expertAccountId', {
            expertAccountId: expert.id,
          })
          .execute();
      }

      const account = this.bankAccountRepo.create({
        ...dto,
        expert,
      });

      const savedAccount = await this.bankAccountRepo.save(account);
      this.logger.log(`Successfully saved bank account ID ${savedAccount.id}`);

      // Emit event
      this.eventEmitter.emit(
        'expert.bank-account.created',
        new BankAccountCreatedEvent(
          expert.id,
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
