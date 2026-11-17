import { Inject, Injectable } from "@nestjs/common";
import { PayoutProviderResolver, PAYOUT_PROVIDER } from "@/external/payouts";
import type { PayoutProvider } from "@/external/payouts/onboarding/payout-provider.interface";

/**
 * Facade over `PayoutProviderResolver` + the default `PAYOUT_PROVIDER`.
 *
 * Centralizes the resolve-with-fallback logic that was duplicated across
 * every payout use-case. Use-cases depend on this single interface instead
 * of importing the resolver and default provider directly.
 */
@Injectable()
export class PayoutProviderService {
  constructor(
    private readonly resolver: PayoutProviderResolver,
    @Inject(PAYOUT_PROVIDER) private readonly defaultProvider: PayoutProvider,
  ) {}

  /** Resolve a provider by code, falling back to the default provider. */
  resolve(providerCode: string): PayoutProvider {
    try {
      return this.resolver.resolve(providerCode);
    } catch {
      return this.defaultProvider;
    }
  }
}
