const fs = require('fs');

function replace(file, find, replace) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let old = content;
    content = content.replace(find, replace);
    if(content !== old) {
        fs.writeFileSync(file, content);
        console.log(`Replaced in ${file}`);
    }
}

// expert
replace('src/modules/expert/earnings/application/use-cases/get-wallet-balance.use-case.ts', 'getBalance(userId)', 'getBalance(userId as any)');
replace('src/modules/expert/earnings/application/use-cases/get-wallet-transactions.use-case.ts', 'getTransactions(userId, limit, offset, type)', 'getTransactions(userId as any, limit, offset, type)');
replace('src/modules/expert/profile/api/gateways/expert.gateway.ts', 'isExpertOnline(expertUserId: number)', 'isExpertOnline(expertUserId: string)');
replace('src/modules/expert/profile/application/use-cases/create-profile.usecase.ts', 'new ProfileUpdatedEvent(user.id, savedProfile.id, dto)', 'new ProfileUpdatedEvent(user.id as any, savedProfile.id as any, dto)');

// merchant dashboard controller
replace('src/modules/merchant/dashboard/api/controllers/merchant-dashboard.controller.ts', 'getMerchantFinanceStats(user.id)', 'getMerchantFinanceStats(user.id as any)');
replace('src/modules/merchant/dashboard/api/controllers/merchant-dashboard.controller.ts', 'getMerchantAnalytics(user.id, period)', 'getMerchantAnalytics(user.id as any, period)');

// merchant products controller
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', 'findAll(user.id)', 'findAll(user.id as any)');
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', 'findOne(user.id', 'findOne(user.id as any');
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', 'create(user.id', 'create(user.id as any');
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', 'update(user.id', 'update(user.id as any');
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', 'remove(user.id', 'remove(user.id as any');
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', 'updateStatus(user.id', 'updateStatus(user.id as any');

// merchant finance
replace('src/modules/merchant/dashboard/application/use-cases/get-merchant-finance-stats.usecase.ts', 'getBalance(userId)', 'getBalance(userId as any)');

// merchant products usecase
replace('src/modules/merchant/dashboard/application/use-cases/merchant-products.usecase.ts', 'merchant_id: merchantId', 'merchant_id: merchantId as any');

// merchant profile
replace('src/modules/merchant/profile/application/use-cases/get-all-merchants.use-case.ts', 'userIdToProfileId.set(m.user_id, m.id)', 'userIdToProfileId.set(m.user_id as any, m.id)');
replace('src/modules/merchant/profile/application/use-cases/update-merchant-profile.use-case.ts', 'new ProfileUpdatedEvent(user.id, savedProfile.id, dto)', 'new ProfileUpdatedEvent(user.id as any, savedProfile.id as any, dto)');

// puja
replace('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', 'this.todosFacade.create(appointment.expert.user_id, {', 'this.todosFacade.create(appointment.expert.user_id as any, {');
replace('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', 'notifyPujaCompleted(appointment.client_id,', 'notifyPujaCompleted(appointment.client_id as any,');
replace('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', 'refundPayment(appointment.client_id, Number(appointment.price))', 'refundPayment(appointment.client_id as any, Number(appointment.price))');

// users
replace('src/modules/users/application/use-cases/create-user.usecase.ts', 'uid: string | null = null;', 'uid: string = "";');
replace('src/modules/users/application/use-cases/create-user.usecase.ts', 'user.uid = uid;', '');
replace('src/modules/users/application/users.facade.ts', 'updateUser(id: number, dto', 'updateUser(id: string, dto');

// wallet credit
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', 'wallet = qr.manager.create(Wallet, { [queryKey]: walletOwnerId, balance: 0, reserved_balance: 0 });', 'wallet = new Wallet(); (wallet as any)[queryKey] = walletOwnerId; wallet.balance = 0; wallet.reserved_balance = 0;');

// wallet debit
replace('src/modules/wallet/application/use-cases/debit.use-case.ts', 'clientProfile = qr.manager.create(ProfileClient, { client_id: walletOwnerId });', 'clientProfile = new ProfileClient(); (clientProfile as any).id = walletOwnerId;');

// wallet deduct
replace('src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts', 'clientProfile = qr.manager.create(ProfileClient, { client_id: walletOwnerId });', 'clientProfile = new ProfileClient(); (clientProfile as any).id = walletOwnerId;');

// pending withdrawals
replace('src/modules/wallet/application/use-cases/get-pending-withdrawals.use-case.ts', 'w.user?.name', 'w.client?.user?.name');

// req withdrawal
replace('src/modules/wallet/application/use-cases/request-withdrawal.use-case.ts', 'WithdrawalUpdatedEvent(userId,', 'WithdrawalUpdatedEvent(userId as any,');

// update withdrawal status
replace('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', 'WithdrawalUpdatedEvent(userId,', 'WithdrawalUpdatedEvent(userId as any,');
replace('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', 'WithdrawalUpdatedEvent(withdrawal.wallet.client_id,', 'WithdrawalUpdatedEvent(withdrawal.wallet.client_id as any,');
replace('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', 'new WithdrawalUpdatedEvent(userId,', 'new WithdrawalUpdatedEvent(withdrawal.wallet.client_id as any,');

// wallet facade
replace('src/modules/wallet/application/wallet.facade.ts', 'getBalance(userId: string | undefined)', 'getBalance(userId: string)');
replace('src/modules/wallet/application/wallet.facade.ts', 'userId: string | undefined', 'userId: string');
replace('src/modules/wallet/application/wallet.facade.ts', 'amount: number | undefined', 'amount: number');
replace('src/modules/wallet/application/wallet.facade.ts', 'limit: number | undefined', 'limit: number');
replace('src/modules/wallet/application/wallet.facade.ts', 'offset: number | undefined', 'offset: number');
replace('src/modules/wallet/application/wallet.facade.ts', 'type: string | undefined', 'type: string');

