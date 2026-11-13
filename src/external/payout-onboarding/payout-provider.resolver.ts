/**
 * Provider resolver for payout providers.
 *
 * Selects a `PayoutProvider` by provider code or by capability
 * (onboarding / payout / webhook) plus optional country and currency match.
 * Used by use-cases that need to pick a provider without hardcoding it.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayoutProvider, PAYOUT_PROVIDER } from './payout-provider.interface';
import { ProviderCapability } from './provider-capability';

/**
 * Minimal in-memory registry of payout providers.
 *
 * In production this would be populated from `payments.payout_provider_accounts`
 * plus a provider catalog. For now, RazorpayX is the only supported provider
 * and is registered directly.
 */
@Injectable()
export class PayoutProviderResolver {
  private readonly logger = new Logger(PayoutProviderResolver.name);
  private providers = new Map<string, PayoutProvider>();

  constructor() {
    // RazorpayX is registered by the module provider (see payout-provider.module.ts).
    // This resolver is a placeholder that delegates to the injected provider map.
  }

  register(provider: PayoutProvider): void {
    this.providers.set(provider.provider, provider);
    this.logger.log(
      `Registered payout provider: ${provider.provider} (caps: ${provider.capabilities.capabilities.join(', ')})`,
    );
  }

  /** Resolve a provider by its stable code (e.g. 'razorpayx'). */
  resolve(providerCode: string): PayoutProvider {
    const provider = this.providers.get(providerCode);
    if (!provider) {
      throw new NotFoundException(
        `No payout provider registered for code: ${providerCode}`,
      );
    }
    return provider;
  }

  /**
   * Resolve all providers that support a given capability, optionally filtered
   * by country and currency. Returns providers in registration order.
   */
  resolveByCapability(
    capability: ProviderCapability,
    countryCode?: string,
    currencyCode?: string,
  ): PayoutProvider[] {
    const results: PayoutProvider[] = [];
    for (const provider of this.providers.values()) {
      if (!provider.capabilities.capabilities.includes(capability)) {
        continue;
      }
      if (
        countryCode &&
        !provider.capabilities.countryCodes.includes(countryCode)
      ) {
        continue;
      }
      if (
        currencyCode &&
        !provider.capabilities.currencyCodes.includes(currencyCode)
      ) {
        continue;
      }
      results.push(provider);
    }
    return results;
  }

  /** Resolve the single best provider for a capability, or throw if none. */
  resolveOne(
    capability: ProviderCapability,
    countryCode?: string,
    currencyCode?: string,
  ): PayoutProvider {
    const matches = this.resolveByCapability(
      capability,
      countryCode,
      currencyCode,
    );
    if (matches.length === 0) {
      throw new NotFoundException(
        `No payout provider supports capability '${capability}'${
          countryCode ? ` for country '${countryCode}'` : ''
        }${currencyCode ? ` and currency '${currencyCode}'` : ''}`,
      );
    }
    return matches[0];
  }
}
