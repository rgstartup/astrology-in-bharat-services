import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
  CallType,
} from '../../infrastructure/entities/call-session.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { Wallet } from '@/modules/finance/wallet/infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallInitiatedEvent } from '../../domain/events/call.events';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

import { InitiateCallDto } from '../../api/dto/initiate-call.dto';

@Injectable()
export class InitiateCallUseCase {
  private readonly logger = new Logger(InitiateCallUseCase.name);

  constructor(
    @InjectRepository(CallSession)
    private sessionRepo: Repository<CallSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private expertProfileFacade: ExpertProfileFacade,
    private readonly dataSource: DataSource,
    private twilioService: TwilioService,
    @Inject(forwardRef(() => CallGateway))
    private callGateway: CallGateway,
    private eventEmitter: EventEmitter2,
  ) {}

  async execute(
    clientId: string,
    dto: InitiateCallDto,
  ) {
    const { expert_id, type = CallType.AUDIO } = dto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Block duplicate sessions — client can only have ONE active/pending call at a time
      const existingSession = await queryRunner.manager.findOne(CallSession, {
        where: [
          { client_id: clientId, status: CallSessionStatus.ACTIVE },
          { client_id: clientId, status: CallSessionStatus.PENDING },
        ],
        relations: ['client', 'client.user'],
      });

      if (existingSession) {
        if (existingSession.expert_id === expert_id) {
          await queryRunner.rollbackTransaction();
          return {
            session: { ...existingSession, isResumed: true },
            token: '',
            roomName: `call_room_${existingSession.id}`,
          };
        }

        throw new BadRequestException({
          message: existingSession.status === CallSessionStatus.ACTIVE
            ? `You already have an ongoing ${existingSession.type} call with another astrologer.`
            : `You already have a pending ${existingSession.type} call request with another astrologer. Please wait for them to accept or cancel it.`,
          existingSessionId: existingSession.id,
          existingExpertId: existingSession.expert_id,
          existingStatus: existingSession.status,
        });
      }

      const expert = await this.expertProfileFacade.getExpertById(expert_id);

      if (!expert) {
        throw new InternalServerErrorException('Expert not found');
      }

      CallPolicy.ensureSessionExists(expert as any);
      CallPolicy.ensureExpertAvailable(Boolean(expert.is_available));

      // ✅ Check if expert is already busy in an active or pending call/video session
      const expertBusyCall = await queryRunner.manager.findOne(CallSession, {
        where: [
          { expert_id, status: CallSessionStatus.ACTIVE },
          { expert_id, status: CallSessionStatus.PENDING },
        ],
      });

      if (expertBusyCall) {
        const busyType = expertBusyCall.type === CallType.VIDEO ? 'video call' : 'audio call';
        throw new InternalServerErrorException(
          expertBusyCall.status === CallSessionStatus.ACTIVE
            ? `This astrologer is currently busy in a ${busyType}. Please try again after some time.`
            : `This astrologer already has a pending ${busyType} request. Please try again in a few minutes.`,
        );
      }

      const callPrice =
        type === CallType.VIDEO
          ? Number(expert.video_call_price) ||
            (Number(expert.price) ? Number(expert.price) * 2 : 0) ||
            0
          : Number(expert.call_price) || Number(expert.price) || 0;

      const minMins = 5;
      const minBalanceRequired = callPrice * minMins;

      const callCount = await queryRunner.manager.count(CallSession, {
        where: { client_id: clientId, status: CallSessionStatus.COMPLETED },
      });

      const isFreeEnabled = process.env.FREE_CHAT_ENABLED === 'true';
      const isEligibleForFree = isFreeEnabled && callCount === 0;
      const freeMins = isEligibleForFree
        ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
        : 0;

      if (!isEligibleForFree) {
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { client_id: clientId },
        });
        const hasBalance = wallet && Number(wallet.balance) >= minBalanceRequired;
        CallPolicy.ensureSufficientBalance(
          Boolean(hasBalance),
          minMins,
          minBalanceRequired,
          type,
        );
      }

      const session = queryRunner.manager.create(CallSession, {
        client_id: clientId,
        expert_id,
        price_per_minute: callPrice,
        status: CallSessionStatus.PENDING,
        type,
        is_free: isEligibleForFree,
        free_minutes: freeMins,
      });

      const savedSession = await queryRunner.manager.save(CallSession, session);
      this.logger.log(
        `Session saved: id=${savedSession.id} (is_free: ${isEligibleForFree})`,
      );

      if (!isEligibleForFree) {
        await this.reserveBalance(
          queryRunner.manager,
          clientId,
          'client_id',
          minBalanceRequired,
          `call_${savedSession.id}`,
        );
        this.logger.log(`Balance reserved for sessionId=${savedSession.id}`);
      }

      const identity = `client_${clientId}_${savedSession.id}`;
      const roomName = `call_room_${savedSession.id}`;

      let token: string;
      try {
        token = this.twilioService.generateToken(identity, type, roomName);
        this.logger.log(`Twilio token generated for identity=${identity}`);
      } catch (error) {
        this.logger.error('Twilio token generation failed', error);
        throw new InternalServerErrorException('Failed to generate call token');
      }

      const sessionWithDetails = await queryRunner.manager.findOne(CallSession, {
        where: { id: savedSession.id },
        relations: ['client', 'client.user'],
      });

      if (sessionWithDetails) {
        (sessionWithDetails as unknown as { expert: typeof expert }).expert =
          expert;
      }

      const result = {
        session: sessionWithDetails || savedSession,
        token,
        roomName,
      };

      await queryRunner.commitTransaction();

      this.callGateway.notifyExpertNewCall(expert_id, result);
      this.logger.log(`Expert notified of new call sessionId=${savedSession.id}`);
      this.eventEmitter.emit(
        'call.initiated',
        new CallInitiatedEvent(savedSession.id, clientId, expert_id, type),
      );

      return result;

    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async reserveBalance(
    manager: EntityManager,
    profileId: string,
    walletKey: string,
    amount: number,
    referenceId: string,
  ): Promise<void> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    let wallet = await manager.findOne(Wallet, {
      where: { [walletKey]: profileId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      wallet = manager.create(Wallet, {
        [walletKey]: profileId,
        balance: 0,
        reserved_balance: 0,
      });
      wallet = await manager.save(Wallet, wallet);
    }

    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance to reserve');
    }

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore - Number(amount);

    wallet.balance = balanceAfter;
    wallet.reserved_balance = Number(wallet.reserved_balance) + Number(amount);
    await manager.save(Wallet, wallet);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: TransactionType.HOLD,
      purpose: TransactionPurpose.CONSULTATION,
      reference_id: referenceId,
    });
    const savedTx = await manager.save(Transaction, transaction);

    try {
      const roleForTx =
        walletKey === 'expert_id'
          ? 'EXPERT'
          : walletKey === 'merchant_id'
            ? 'MERCHANT'
            : walletKey === 'agent_id'
              ? 'AGENT'
              : 'CLIENT';

      savedTx.transaction_no = generateTransactionNo(
        roleForTx,
        TransactionPurpose.CONSULTATION,
        savedTx.id,
      );
      await manager.save(Transaction, savedTx);
    } catch (err) {
      console.error(`[RESERVE_TX] Failed to generate transaction no: ${(err as Error).message}`);
    }
  }
}
