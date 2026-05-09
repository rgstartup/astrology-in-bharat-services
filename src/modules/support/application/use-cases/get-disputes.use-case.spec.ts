import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDisputesUseCase } from './get-disputes.use-case';
import { Dispute } from '../../infrastructure/entities/dispute.entity';

describe('GetDisputesUseCase', () => {
    let useCase: GetDisputesUseCase;
    let repo: Repository<Dispute>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetDisputesUseCase,
                {
                    provide: getRepositoryToken(Dispute),
                    useValue: {
                        find: jest.fn(),
                    },
                },
            ],
        }).compile();

        useCase = module.get<GetDisputesUseCase>(GetDisputesUseCase);
        repo = module.get<Repository<Dispute>>(getRepositoryToken(Dispute));
    });

    it('should call find with the correct criteria', async () => {
        const userId = 1;
        await useCase.execute(userId);

        expect(repo.find).toHaveBeenCalledWith({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    });
});
