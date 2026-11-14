import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RazorpayXOnboardingService } from "./providers/razorpayx/razorpayx-onboarding.service";
import { RazorpayPayoutService } from "@/internal/finance/wallet/gateways/razorpay-payout.service";

/**
 * Resolves the active payout onboarding service from config.
 *
 * Reads `PAYOUT_PLATFORM_DRIVER` env (default 'razorpayx') and instantiates
 * the matching service. Adding a future provider means creating a new module
 * directory and adding a case here — zero edits to use-cases or the actor module.
 */
@Injectable()
export class PayoutOnboardingFactory {
  private readonly logger = new Logger(PayoutOnboardingFactory.name);
  private serviceCache = new Map<string, any>();

  constructor(
    private readonly configService: ConfigService,
    private readonly payoutService: RazorpayPayoutService,
  ) {}

  resolve(): any {
    const driverKey = (this.configService.get<string>(
      "PAYOUT_PLATFORM_DRIVER",
    ) ?? "razorpayx") as string;

    const cached = this.serviceCache.get(driverKey);
    if (cached) {
      return cached;
    }

    let service: any;
    switch (driverKey) {
      case "razorpayx":
        service = new RazorpayXOnboardingService(
          this.configService,
          this.payoutService,
        );
        break;
      default:
        this.logger.error(
          `Unknown payout platform driver: ${driverKey}. Falling back to razorpayx.`,
        );
        service = new RazorpayXOnboardingService(
          this.configService,
          this.payoutService,
        );
        break;
    }

    this.serviceCache.set(driverKey, service);
    return service;
  }
}
