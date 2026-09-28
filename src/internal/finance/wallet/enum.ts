export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  HOLD = 'hold',
  RELEASE = 'release',
}

export enum TransactionPurpose {
  RECHARGE = 'recharge',
  CONSULTATION = 'consultation',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  PRODUCT_PURCHASE = 'product_purchase',
  PUJA_CONFIRMATION = 'puja_confirmation',
  AGENT_COMMISSION = 'agent_commission',
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  SUCCESS = 'success',
  FAILED = 'failed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}
