import { Injectable } from '@nestjs/common';

@Injectable()
export class GetMerchantActivityUseCase {
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async execute(userId: string) {
    // Returning Mock data as requested to make the dashboard "Live"
    return [
      {
        type: 'sale',
        message: 'New order received for Blue Sapphire Ring',
        time: '5 mins ago',
      },
      {
        type: 'review',
        message: 'Customer gave 5 stars for Rudraksha Mala',
        time: '2 hours ago',
      },
      {
        type: 'inventory',
        message: 'Stock low for Emerald Pendant (2 left)',
        time: 'Yesterday',
      },
      {
        type: 'system',
        message: 'Your monthly performance report is ready',
        time: '2 days ago',
      },
    ];
  }
}
