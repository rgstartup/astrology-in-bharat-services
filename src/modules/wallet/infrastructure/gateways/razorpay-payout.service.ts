import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RazorpayPayoutService {
  private readonly logger = new Logger(RazorpayPayoutService.name);
  constructor(private configService: ConfigService) {}

  /**
   * Helper to make authorized REST calls to RazorpayX APIs
   */
  private async makeRequest(endpoint: string, method: string, data?: any) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new InternalServerErrorException('Razorpay credentials are not configured');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    try {
      const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error?.description || result.message || 'Unknown Razorpay Error';
        this.logger.error(`Razorpay API Error [${method} ${endpoint}]: ${errorMsg}`, result);
        throw new Error(errorMsg);
      }

      return result;
    } catch (err) {
      this.logger.error(`Razorpay Request Failed [${method} ${endpoint}]: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create or find a RazorpayX contact for the expert
   */
  async getOrCreateContact(user: { id: string; name: string; email?: string; phone_number?: string }) {
    try {
      // RazorpayX Contacts API: POST /contacts
      const response = await this.makeRequest('/contacts', 'POST', {
        name: user.name || `User ${user.id}`,
        email: user.email || `expert_${user.id}@example.com`,
        contact: user.phone_number || '9999999999',
        type: 'vendor',
        reference_id: `USER-${user.id}`,
      });
      return response.id;
    } catch (err) {
      this.logger.error('Failed to create Razorpay contact', err);
      throw new InternalServerErrorException(`Razorpay Contact Error: ${err.message}`);
    }
  }

  /**
   * Create or find a Fund Account for the expert's bank details
   */
  async getOrCreateFundAccount(contactId: string, bankDetails: { name: string; account: string; ifsc: string }) {
    try {
      // RazorpayX Fund Accounts API: POST /fund_accounts
      const response = await this.makeRequest('/fund_accounts', 'POST', {
        contact_id: contactId,
        account_type: 'bank_account',
        bank_account: {
          name: bankDetails.name.trim(),
          ifsc: bankDetails.ifsc.trim().toUpperCase(),
          account_number: bankDetails.account.trim(),
        },
      });
      return response.id;
    } catch (err) {
      this.logger.error('Failed to create Razorpay Fund Account', err);
      throw new InternalServerErrorException(`Razorpay Fund Account Error: ${err.message}`);
    }
  }

  /**
   * Initiate a Payout
   */
  async initiatePayout(withdrawalId: number, amount: number, fundAccountId: string) {
    const accountNumber = this.configService.get<string>('RAZORPAY_X_ACCOUNT_NUMBER');

    if (!accountNumber || accountNumber.includes('ADD_YOUR')) {
      throw new InternalServerErrorException('RazorpayX Account Number is not configured correctly in .env');
    }

    try {
      // RazorpayX Payouts API: POST /payouts
      // Amount in paise (₹1 = 100 paise)
      const response = await this.makeRequest('/payouts', 'POST', {
        account_number: accountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: withdrawalId.toString(),
        narration: 'Astrology in Bharat Payout'
      });
      return response;
    } catch (err) {
      this.logger.error('Failed to initiate Razorpay Payout', err);
      throw new InternalServerErrorException(`Razorpay Payout Error: ${err.message}`);
    }
  }
}

