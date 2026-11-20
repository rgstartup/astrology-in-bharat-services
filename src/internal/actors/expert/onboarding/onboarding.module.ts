import { Module } from '@nestjs/common';
import { OnboardingController } from './controllers/onboarding.controller';
import { CompleteOnboardingUseCase } from './use-cases/complete-onboarding.usecase';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [ExpertAuthModule],
  controllers: [OnboardingController],
  providers: [CompleteOnboardingUseCase],
})
export class OnboardingModule {}
