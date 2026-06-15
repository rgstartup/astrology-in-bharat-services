import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable } from '@nestjs/common';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';

@Injectable()
export class SendOrderOtpUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    private notificationFacade: NotificationFacade,
    private notificationGateway: NotificationGateway,
    private emailService: NodeMailerService,
  ) {}

  async execute(merchantId: string, orderId: string) {
    const { order } = await this.orderFacade.sendOrderOtp(
      orderId,
      merchantId,
    );

    const otp = order.delivery_otp;
    const title = 'Delivery Verification';
    const message = `Your delivery verification OTP for order #${orderId} is ${otp}. Please share this with the delivery partner.`;

    const targetProfileId = order.client_id as string;

    // 1. Save Notification
    await this.notificationFacade.create(
      targetProfileId,
      RoleEnum.CLIENT,
      NotificationType.ORDER_SHIPPED, // Reusing SHIPPED type for OTP context
      title,
      message,
      { orderId, otp },
    );

    // 2. Emit Socket
    this.notificationGateway.emitToProfile(
      targetProfileId,
      'order_status_updated',
      {
        orderId,
        status: order.status,
        title,
        message,
      },
    );

    // 3. Send Email
    try {
      const user = order.client?.user;
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
