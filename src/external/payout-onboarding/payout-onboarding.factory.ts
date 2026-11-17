import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PAYOUT_ONBOARDING_SERVICE } from "./payout-onboarding.interface";
import type { PayoutOnboardingService } from "./payout-onboarding.interface";

/**
 * Resolves the active payout onboarding service from config.
 *
 * Reads `PAYOUT_PLATFORM_DRIVER` env (default 'razorpayx') and returns
 * the matching service via the PAYOUT_ONBOARDING_SERVICE DI token.
 * Adding a future provider means creating a new module directory and
 * registering it — zero edits to use-cases or the actor module.
 */
@Injectable()
export class PayoutOnboardingFactory implements OnModuleInit {
  private readonly logger = new Logger(PayoutOnboardingFactory.name);
  private serviceCache = new Map<string, PayoutOnboardingService>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboardingService: PayoutOnboardingService,
  ) {}

  onModuleInit(): void {
    this.logger.log(`PayoutOnboardingFactory initialized with provider: ${this.onboardingService.provider}`);
  }

  resolve(): PayoutOnboardingService {
    const driverKey = (this.configService.get<string>(
      "PAYOUT_PLATFORM_DRIVER",
    ) ?? "razorpayx") as string;

    const cached = this.serviceCache.get(driverKey);
    if (cached) {
      return cached;
    }

    // For now, only razorpayx is supported. The DI token already provides the correct implementation.
    if (driverKey !== "razorpayx") {
      this.logger.error(
        `Unknown payout platform driver: ${driverKey}. Falling back to razorpayx.`,
      );
    }

    this.serviceCache.set(driverKey, this.onboardingService);
    return this.onboardingService;
  }
}
