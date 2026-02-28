export class PaymentOrderCreatedEvent {
  constructor(
    public readonly userId: number,
    public readonly razorpayOrderId: string,
    public readonly amount: number,
  ) {}
}

export class PaymentVerifiedEvent {
  constructor(
    public readonly userId: number,
    public readonly razorpayOrderId: string,
    public readonly razorpayPaymentId: string,
  ) {}
}
