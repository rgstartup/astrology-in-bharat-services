export interface PaymentOrderOptions {
  amount: number; // In smallest currency unit (e.g., paise)
  currency: string;
  receipt: string;
  notes?: Record<string, any>;
}

export interface PaymentOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
  status: string;
  rawResponse: any;
}

export interface VerifySignatureOptions {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface WebhookValidationRequest {
  headers: Record<string, string | string[] | undefined>;
  body: any;
  rawBody?: Buffer;
}

export interface StandardWebhookEvent {
  eventType: 'payment.success' | 'payment.failed' | 'other';
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  metadata?: Record<string, any>;
  failureReason?: string;
  rawEvent: any;
}

export const PAYMENT_GATEWAY = 'IPaymentGateway';

/**
 * Generic Payment Gateway Interface that abstracts away specific provider logic.
 */
export interface IPaymentGateway {
  readonly providerName: string;

  /**
   * Create an order on the payment gateway
   */
  createOrder(options: PaymentOrderOptions): Promise<PaymentOrderResult>;

  /**
   * Verify the payment signature from the client success callback
   */
  verifySignature(options: VerifySignatureOptions): boolean;

  /**
   * Verify the webhook signature received from the payment gateway
   */
  verifyWebhookSignature(request: WebhookValidationRequest): boolean;

  /**
   * Parse the vendor-specific webhook payload into a standardized domain event
   */
  parseWebhook(request: WebhookValidationRequest): StandardWebhookEvent;

  /**
   * @deprecated Use verifyWebhookSignature(request) instead
   */
  validateWebhookSignature?(
    payload: string | Record<string, any>,
    signature: string,
  ): boolean;
}
