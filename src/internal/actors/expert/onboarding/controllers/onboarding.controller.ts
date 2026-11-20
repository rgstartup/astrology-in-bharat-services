import { Controller, Post, UseGuards } from "@nestjs/common";
import { ExpertJwtAuthGuard } from "../../auth/guards/auth.guard";
import { CurrentExpert } from "../../auth/decorators/current-expert.decorator";
import { type IExpert } from "../../../../../shared/types/access-token.payload";
import { CompleteOnboardingUseCase } from "../use-cases/complete-onboarding.usecase";

@Controller({
  path: "expert/onboarding",
  version: "1",
})
@UseGuards(ExpertJwtAuthGuard)
export class OnboardingController {
  constructor(private readonly completeOnboardingUseCase: CompleteOnboardingUseCase) {}

  /** Marks onboarding done — used by both "Finish" and "Skip". */
  @Post("complete")
  async complete(@CurrentExpert() expert: IExpert) {
    await this.completeOnboardingUseCase.execute(expert);
    return { ok: true };
  }
}
