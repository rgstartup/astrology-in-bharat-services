import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../infrastructure/persistence/entities/order.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private notificationFacade: NotificationFacade,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
  ) { }

  async execute(id: number, status: OrderStatus, cancellationReason?: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    order.status = status;
    if (cancellationReason) {
      order.cancellation_reason = cancellationReason;
    }

    const updatedOrder = await this.orderRepo.save(order);

    // Create notification and emit socket event based on status
    let notificationType: NotificationType;
    let title: string;
    let message: string;

    switch (status) {
      case OrderStatus.PACKED:
        notificationType = NotificationType.ORDER_PACKED;
        title = 'Order Packed';
        message = `Your order #${id} has been packed and is ready for shipment`;
        break;
      case OrderStatus.SHIPPED:
        notificationType = NotificationType.ORDER_SHIPPED;
        title = 'Order Shipped';
        message = `Your order #${id} has been shipped`;
        break;
      case OrderStatus.DELIVERED:
        notificationType = NotificationType.ORDER_DELIVERED;
        title = 'Order Delivered';
        message = `Your order #${id} has been delivered`;
        break;
      case OrderStatus.CANCELLED:
        notificationType = NotificationType.ORDER_CANCELLED;
        title = 'Order Cancelled';
        message = cancellationReason
          ? `Your order #${id} has been cancelled. Reason: ${cancellationReason}`
          : `Your order #${id} has been cancelled`;
        break;
      default:
        return updatedOrder; // No notification for other statuses
    }

    // Save notification to DB via facade
    await this.notificationFacade.create(
      order.user_id,
      notificationType,
      title,
      message,
      { orderId: id, status, amount: order.total_amount },
    );

    // Emit real-time socket event to user
    this.notificationGateway.emitToUser(order.user_id, 'order_status_updated', {
      orderId: id,
      status,
      title,
      message,
      cancellationReason,
    });

    // Send status update email to user
    try {
      const user = await this.userRepo.findOne({ where: { id: order.user_id } });
      if (user?.email) {
        const emailHtml = `
          <h2>${title}</h2>
          <p>Dear ${user.name || 'Customer'},</p>
          <p>${message}</p>
          <p><strong>Order ID:</strong> #${id}</p>
          <p><strong>New Status:</strong> ${status}</p>
          ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
          <p>Thank you for your patience!</p>
        `;
        await this.emailService.sendEmail(
          user.email,
          `Order Update - ${title}`,
          emailHtml,
        );
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
    }

    return updatedOrder;
  }
}
