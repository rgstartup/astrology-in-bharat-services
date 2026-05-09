import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetProfileUseCase } from './get-profile.usecase';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';

describe('GetProfileUseCase', () => {
    let useCase: GetProfileUseCase;
    let repo: Repository<ProfileClient>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetProfileUseCase,
                {
                    provide: getRepositoryToken(ProfileClient),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        useCase = module.get<GetProfileUseCase>(GetProfileUseCase);
        repo = module.get<Repository<ProfileClient>>(getRepositoryToken(ProfileClient));
    });

    it('should call findOne with the correct relations', async () => {
        const userId = 1;
        await useCase.execute(userId);

        expect(repo.findOne).toHaveBeenCalledWith({
            where: { user: { id: userId } },
            relations: ['user'],
        });
    });
});
