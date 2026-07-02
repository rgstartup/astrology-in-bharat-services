import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { PujaAppointmentFacade } from '@/modules/puja-appointment/application/puja-appointment.facade';

@Injectable()
export class GetAdminEarningsBreakdownUseCase {
  constructor(
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
    @Inject(forwardRef(() => OrderFacade))
    private readonly orderFacade: OrderFacade,
    @Inject(forwardRef(() => PujaAppointmentFacade))
    private readonly pujaFacade: PujaAppointmentFacade,
  ) {}

  async execute(days: number = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // Chat earnings
    const chatTotal = await this.chatFacade.getEarnings(dateLimit);

    // Call earnings (Audio)
    const callTotal = await this.callFacade.getEarnings(dateLimit, 'audio');

    // Video earnings
    const videoTotal = await this.callFacade.getEarnings(dateLimit, 'video');

    // Product earnings
    const productTotal = await this.orderFacade.getOrderEarnings(dateLimit);

    // Puja earnings
    const pujaTotal = await this.pujaFacade.getPujaEarnings(dateLimit);

    return [
      { name: 'Chat', value: chatTotal, color: '#f97316' },
      { name: 'Call', value: callTotal, color: '#3b82f6' },
      { name: 'Video Call', value: videoTotal, color: '#ec4899' },
      { name: 'Product Selling', value: productTotal, color: '#10b981' },
      { name: 'Puja Service', value: pujaTotal, color: '#8b5cf6' },
    ];
  }
}
