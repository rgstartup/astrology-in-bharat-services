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

// 1. Bank Account Events
replace('src/modules/expert/bank-accounts/domain/events/bank-account-events.ts', /userId:\s*number/g, 'userId: string');
replace('src/modules/expert/bank-accounts/domain/events/bank-account-events.ts', /accountId:\s*number/g, 'accountId: string');
replace('src/modules/expert/bank-accounts/domain/events/bank-account-events.ts', /oldAccountId\?:\s*number/g, 'oldAccountId?: string');
replace('src/modules/expert/bank-accounts/domain/events/bank-account-events.ts', /newAccountId\?:\s*number/g, 'newAccountId?: string');

// 2. Expert dashboard facade
replace('src/modules/expert/dashboard/application/expert-dashboard.facade.ts', /userId:\s*number/g, 'userId: string');

// 3. get-earnings-stats
replace('src/modules/expert/earnings/application/use-cases/get-earnings-stats.use-case.ts', /getWithdrawalsStatus\(userId\)/g, 'getWithdrawalsStatus(userId as any)');
replace('src/modules/expert/earnings/application/use-cases/get-earnings-stats.use-case.ts', /getTransactions\(userId/g, 'getTransactions(userId as any');

// 4. Expert Gateway
replace('src/modules/expert/profile/api/gateways/expert.gateway.ts', /isExpertOnline\(userId/g, 'isExpertOnline(userId as any');
replace('src/modules/expert/profile/api/gateways/expert.gateway.ts', /expertUserId:\s*number/g, 'expertUserId: string');

// 5. Merchant Dashboard & Products
replace('src/modules/merchant/dashboard/api/controllers/merchant-dashboard.controller.ts', /user\.id/g, 'user.id as any');
replace('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', /user\.id/g, 'user.id as any');

// 6. get-merchant-finance
replace('src/modules/merchant/dashboard/application/use-cases/get-merchant-finance-stats.usecase.ts', /getWithdrawalsStatus\(userId/g, 'getWithdrawalsStatus(userId as any');

// 7. Merchant profile
replace('src/modules/merchant/profile/application/use-cases/get-all-merchants.use-case.ts', /m\.user_id\s+as\s+any/g, 'm.user_id as any as string');
replace('src/modules/merchant/profile/application/use-cases/update-merchant-profile.use-case.ts', /userId,/g, 'userId as any,');

// 8. Puja appointment
replace('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', /appointment\.expert\.user_id\s+as\s+any\s+as\s+string/g, 'appointment.expert.user_id as any');
replace('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', /appointment\.client\?\.user_id\s*\|\|\s*''/g, 'appointment.client?.user_id as any || ""');

// 9. Wallet Facade again
replace('src/modules/wallet/application/wallet.facade.ts', /userId:\s*number/g, 'userId: string');
replace('src/modules/wallet/application/wallet.facade.ts', /userId:\s*string\s*\|\s*undefined/g, 'userId: string');
replace('src/modules/wallet/application/wallet.facade.ts', /amount:\s*number\s*\|\s*undefined/g, 'amount: number');
replace('src/modules/wallet/application/wallet.facade.ts', /limit:\s*number\s*\|\s*undefined/g, 'limit: number');
replace('src/modules/wallet/application/wallet.facade.ts', /offset:\s*number\s*\|\s*undefined/g, 'offset: number');
replace('src/modules/wallet/application/wallet.facade.ts', /type:\s*string\s*\|\s*undefined/g, 'type: string');

// 10. users.facade.ts
replace('src/modules/users/application/users.facade.ts', /id:\s*number/g, 'id: string');

// 11. request-withdrawal
replace('src/modules/wallet/application/use-cases/request-withdrawal.use-case.ts', /WithdrawalUpdatedEvent\(userId/g, 'WithdrawalUpdatedEvent(userId as any');

// 12. update-withdrawal
replace('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', /WithdrawalUpdatedEvent\(userId/g, 'WithdrawalUpdatedEvent(userId as any');
replace('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', /withdrawal\.wallet\.client_id/g, 'withdrawal.wallet.client_id as any');

// 13. get pending withdrawals
replace('src/modules/wallet/application/use-cases/get-pending-withdrawals.use-case.ts', /w\.user\?\.name/g, 'w.client?.user?.name');
replace('src/modules/wallet/application/use-cases/get-pending-withdrawals.use-case.ts', /w\.user\?\.phone/g, 'w.client?.user?.phone');

// 14. Credit
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', /wallet\s*=\s*qr\.manager\.create\(Wallet/g, 'wallet = new Wallet(); // qr.manager.create(Wallet');
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', /\[queryKey\]:\s*walletOwnerId/g, '');
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', /balance:\s*0/g, '');
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', /reserved_balance:\s*0/g, '');
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', /as\s*any\);/g, '');
replace('src/modules/wallet/application/use-cases/credit.use-case.ts', /walletOwnerId;/g, 'walletOwnerId; wallet[queryKey] = walletOwnerId; wallet.balance = 0; wallet.reserved_balance = 0;');

// 15. Debit
replace('src/modules/wallet/application/use-cases/debit.use-case.ts', /clientProfile\s*=\s*qr\.manager\.create\(ProfileClient,\s*\{\s*client_id:\s*walletOwnerId\s*\}\);/g, 'clientProfile = new ProfileClient(); clientProfile.id = walletOwnerId as any;');

// 16. Deduct
replace('src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts', /clientProfile\s*=\s*qr\.manager\.create\(ProfileClient,\s*\{\s*client_id:\s*walletOwnerId\s*\}\);/g, 'clientProfile = new ProfileClient(); clientProfile.id = walletOwnerId as any;');

