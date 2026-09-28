export enum ClientRechargeStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  EXPIRED = 'expired',
}
export enum ClientTransactionPurpose {
  RECHARGE = 'recharge',
  CONSULTATION = 'consultation',
  REFUND = 'refund',
  PRODUCT_PURCHASE = 'product_purchase',
  BOOKING_CONFIRMATION = 'booking_confirmation',
  PUJA_CONFIRMATION = 'puja_confirmation',
}

export enum ClientTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  HOLD = 'hold',
  RELEASE = 'release',
}
