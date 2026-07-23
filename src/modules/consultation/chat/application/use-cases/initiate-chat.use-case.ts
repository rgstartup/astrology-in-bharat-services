import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { Wallet } from '@/modules/finance/wallet/infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';

@Injectable()
export class InitiateChatUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private expertProfileFacade: ExpertProfileFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    clientId: string,
    expert_id: string,
    metadata?: Record<string, unknown>,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ Check if user already has an ACTIVE or PENDING session
      const existingSession = await queryRunner.manager.findOne(ChatSession, {
        where: [
          {
            client_id: clientId,
            status: ChatSessionStatus.ACTIVE,
          },
          {
            client_id: clientId,
            status: ChatSessionStatus.PENDING,
          },
        ],
        relations: ['client', 'client.user'],
      });

      if (existingSession) {
        // Same expert → return existing session so frontend can redirect back to it
        if (existingSession.expert_id === expert_id) {
          await queryRunner.rollbackTransaction();
          return { ...existingSession, isResumed: true };
        }

        // Different expert → block completely
        throw new BadRequestException({
          message: existingSession.status === ChatSessionStatus.ACTIVE
            ? 'You already have an ongoing chat session with another astrologer. Please end it before starting a new one.'
            : 'You already have a pending chat request with another astrologer. Please wait for it to expire or cancel it first.',
          existingSessionId: existingSession.id,
          existingExpertId: existingSession.expert_id,
          existingStatus: existingSession.status,
        });
      }

      const expert = await this.expertProfileFacade.getExpertById(expert_id);

      if (!expert) {
        throw new NotFoundException('Expert not found');
      }

      if (!expert.is_available) {
        throw new BadRequestException(
          'Expert is currently offline and not accepting chat requests at the moment.',
        );
      }

      // ✅ Check if expert is already busy in an active or pending chat session
      const expertBusySession = await queryRunner.manager.findOne(ChatSession, {
        where: [
          { expert_id, status: ChatSessionStatus.ACTIVE },
          { expert_id, status: ChatSessionStatus.PENDING },
        ],
      });

      if (expertBusySession) {
        throw new BadRequestException(
          expertBusySession.status === ChatSessionStatus.ACTIVE
            ? 'This astrologer is currently busy in a consultation. Please try again after some time.'
            : 'This astrologer already has a pending request. Please try again in a few minutes.',
        );
      }

      const chatPrice = Number(expert.chat_price) || 0;
      const minMins = 5;
      const minBalanceRequired = chatPrice * minMins;

      // Check for Free Consultation eligibility (First chat ever)
      const chatCount = await queryRunner.manager.count(ChatSession, {
        where: {
          client_id: clientId,
          status: ChatSessionStatus.COMPLETED,
        },
      });

      const isFreeEnabled = process.env.FREE_CHAT_ENABLED === 'true';
      const isEligibleForFree = isFreeEnabled && chatCount === 0;
      const freeMins = isEligibleForFree
        ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
        : 0;

      if (!isEligibleForFree) {
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { client_id: clientId },
        });
        const hasBalance = wallet && Number(wallet.balance) >= minBalanceRequired;
        if (!hasBalance) {
          throw new BadRequestException(
            `You don't have enough money to talk 5 minutes to expert. Please add some more money in your wallet.`,
          );
        }
      }

      const session = queryRunner.manager.create(ChatSession, {
        client_id: clientId,
        expert_id: expert_id,
        price_per_minute: chatPrice,
        status: ChatSessionStatus.PENDING,
        is_free: isEligibleForFree,
        free_minutes: freeMins,
        metadata,
      });

      const savedSession = await queryRunner.manager.save(ChatSession, session);

      // Hold balance only if not free
      if (!isEligibleForFree) {
        await this.reserveBalance(
          queryRunner.manager,
          clientId,
          'client_id',
          minBalanceRequired,
          `chat_${savedSession.id}`,
        );
      }

      // Fetch again with relations to ensure client info is included for the expert dashboard
      const sessionWithUser = await queryRunner.manager.findOne(ChatSession, {
        where: { id: savedSession.id },
        relations: ['client', 'client.user'],
      });

      if (sessionWithUser && sessionWithUser.client) {
        const profileClient = sessionWithUser.client;
        if (profileClient && profileClient.profile_picture) {
          (sessionWithUser as unknown as { user_image: string }).user_image =
            profileClient.profile_picture;
        }
      }

      await queryRunner.commitTransaction();
      return sessionWithUser || savedSession;

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
