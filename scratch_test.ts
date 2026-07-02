import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Order } from './src/modules/commerce/order/infrastructure/entities/order.entity';
import { User } from './src/modules/users/infrastructure/entities/user.entity';
import { WalletFacade } from './src/modules/wallet/application/wallet.facade';
import { TransactionPurpose } from './src/modules/wallet/infrastructure/entities/transaction.entity';

async function run() {
  console.log('Starting settlement test...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const walletFacade = app.get(WalletFacade);

  const orderId = '019eb65b-d933-7c71-a2d8-58d6792db698'; // from the screenshot
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    console.log('Fetching order...');
    const orderWithItems = await qr.manager.findOne(Order, {
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!orderWithItems) {
      throw new Error('Order not found');
    }

    console.log('Order found with', orderWithItems.items.length, 'items');

    const gstRate = await walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
    const platformFeeRate = await walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_PUJA_SHOP');
    const buyerAgentRateSetting = await walletFacade.getAdminCommissionFromSetting('COMMISION_FOR_BUYER_AGENT');

    for (const item of orderWithItems.items) {
      const itemTotal = Number(item.price) * (item.quantity || 1);
      const merchantId = item.product?.merchant_id;

      if (merchantId) {
        console.log(`Processing item ${item.id} for merchant ${merchantId}, total: ${itemTotal}`);
        
        const merchantUser = await qr.manager.findOne(User, {
          where: { id: merchantId },
        });

        const { ProfileMerchant } = await import(
          './src/modules/merchant/profile/infrastructure/entities/profile-merchant.entity'
        );
        const merchantProfile = await qr.manager.findOne(ProfileMerchant, {
          where: { user: { id: merchantId } },
        });

        let agent_commission = 0;
        let agent_id: string | undefined = undefined;

        if (merchantUser?.referred_by_id && merchantProfile) {
          agent_id = merchantUser.referred_by_id;
          const effectiveAgentRate = merchantProfile.agent_commission_rate ?? platformFeeRate;
          agent_commission = Number((itemTotal * (effectiveAgentRate / 100)).toFixed(2));
        }

        let buyer_agent_commission = 0;
        let buyer_agent_id: string | undefined = undefined;

        const buyerUser = await qr.manager.findOne(User, {
          where: { id: orderWithItems.client_id },
          select: ['id', 'referred_by_id'],
        });

        if (buyerUser?.referred_by_id) {
          buyer_agent_id = buyerUser.referred_by_id;
          buyer_agent_commission = Number((itemTotal * (buyerAgentRateSetting / 100)).toFixed(2));
        }

        const platformFee = Number((itemTotal * (platformFeeRate / 100)).toFixed(2));
        const gst = Number((platformFee * (gstRate / 100)).toFixed(2));
        const merchantNet = Number((itemTotal - platformFee - gst - agent_commission - buyer_agent_commission).toFixed(2));

        console.log(`Crediting merchant with ${merchantNet}...`);
        await walletFacade.credit(
          merchantId,
          'merchant_id',
          merchantNet,
          TransactionPurpose.CONSULTATION,
          `order_item_${item.id}`,
          qr,
        );
        console.log('Merchant credited successfully.');
      }
    }
    
    await qr.rollbackTransaction(); // Rollback so we don't actually modify DB
    console.log('Test completed successfully');
  } catch (err: any) {
    await qr.rollbackTransaction();
    console.error('ERROR during settlement:', err);
  } finally {
    await qr.release();
    await app.close();
  }
}

run();
