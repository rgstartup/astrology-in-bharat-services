import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '@/modules/order/infrastructure/entities/order.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';

@Injectable()
export class SendOrderOtpUseCase {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private notificationFacade: NotificationFacade,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
  ) { }

  async execute(merchantId: number, orderId: number) {
    const order = await this.orderRepo.findOne({ 
      where: { id: orderId },
      relations: ['items', 'items.product']
    });
    
    if (!order) throw new NotFoundException('Order not found');

    // Ownership check
    const belongsToMerchant = order.items.some(item => item.product?.merchant_id === merchantId);
    if (!belongsToMerchant) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    // Generate OTP if not exists
    if (!order.delivery_otp) {
        order.delivery_otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this.orderRepo.save(order);
    }

    const otp = order.delivery_otp;
    const title = 'Delivery Verification';
    const message = `Your delivery verification OTP for order #${orderId} is ${otp}. Please share this with the delivery partner.`;

    // 1. Save Notification
    await this.notificationFacade.create(
      order.user_id,
      NotificationType.ORDER_SHIPPED, // Reusing SHIPPED type for OTP context
      title,
      message,
      { orderId, otp }
    );

    // 2. Emit Socket
    this.notificationGateway.emitToUser(order.user_id, 'order_status_updated', {
      orderId,
      status: order.status,
      title,
      message,
    });

    // 3. Send Email
    try {
      const user = await this.userRepo.findOne({ where: { id: order.user_id } });
      if (user?.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #fd6410;">Delivery Verification OTP</h2>
            <p>Dear ${user.name || 'Customer'},</p>
            <p>Your order <strong>#${orderId}</strong> is ready for delivery verification.</p>
            <div style="background-color: #fffaf0; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; border: 2px dashed #fd6410;">
              <h1 style="margin: 0; color: #fd6410; letter-spacing: 10px; font-size: 36px;">${otp}</h1>
              <p style="margin-top: 10px; color: #666; font-size: 14px;">Share this OTP with our delivery partner only at your doorstep.</p>
            </div>
            <p>Thank you for shopping with us!</p>
          </div>
        `;
        await this.emailService.sendEmail(
          user.email,
          `Delivery Verification OTP - Order #${orderId}`,
          emailHtml,
        );
      }
    } catch (e) {
      console.error('[SEND_OTP] Email failed:', e);
    }

    return { success: true, message: 'OTP sent successfully' };
  }
}
