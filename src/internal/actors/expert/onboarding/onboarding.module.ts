import { Module } from '@nestjs/common';
import { OnboardingController } from './controllers/onboarding.controller';
import { GetOnboardingStatusUseCase } from './use-cases/get-onboarding-status.usecase';
import { CompleteOnboardingUseCase } from './use-cases/complete-onboarding.usecase';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [ExpertAuthModule],
  controllers: [OnboardingController],
  providers: [GetOnboardingStatusUseCase, CompleteOnboardingUseCase],
  exports: [GetOnboardingStatusUseCase],
})
export class OnboardingModule {}
