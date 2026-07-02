import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'merchant',
})
export class MerchantGateway {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MerchantGateway');

  // Method to manually notify status change
  notifyStatusChange(merchantId: number, isOnline: boolean) {
    this.logger.log(
      `Attempting to broadcast status change for merchant ${merchantId}: ${isOnline}`,
    );
    this.server.emit('merchant_status_changed', {
      merchant_id: merchantId,
      is_online: isOnline,
      status: isOnline ? 'online' : 'offline',
    });
    this.logger.log(
      `SUCCESS: Broadcasted merchant_status_changed for merchant ${merchantId}`,
    );
  }
}
