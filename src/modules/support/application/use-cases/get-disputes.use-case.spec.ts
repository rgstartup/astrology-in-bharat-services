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
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetDisputesUseCase>(GetDisputesUseCase);
    repo = module.get<Repository<Dispute>>(getRepositoryToken(Dispute));
  });

  it('should call createQueryBuilder with the correct criteria', async () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    await useCase.execute(userId);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.createQueryBuilder).toHaveBeenCalledWith('dispute');
  });
});
