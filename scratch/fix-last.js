const fs = require('fs');

function replaceFile(path, replacements) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf-8');
    for(const [find, replace] of replacements) {
        content = content.replace(find, replace);
    }
    fs.writeFileSync(path, content);
}

// 1. send-review-response
replaceFile('src/modules/consultation/reviews/application/use-cases/send-review-response.use-case.ts', [
    [/reviewId: number/g, 'reviewId: string'],
    [/review\.expert\.client\.id/g, 'review.expert.user.id as any'],
    [/reviewId: reviewId/g, 'reviewId: reviewId as any']
]);

// 2. expert bank accounts controller
replaceFile('src/modules/expert/bank-accounts/api/controllers/bank-accounts.controller.ts', [
    [/user\.id\s*,\s*createBankAccountDto/g, 'user.id as any, createBankAccountDto'],
    [/findAll\(user\.id\)/g, 'findAll(user.id as any)'],
    [/findOne\(user\.id,\s*id\)/g, 'findOne(user.id as any, id)'],
    [/update\(user\.id,\s*id,\s*updateBankAccountDto\)/g, 'update(user.id as any, id, updateBankAccountDto)'],
    [/setPrimary\(user\.id,\s*id\)/g, 'setPrimary(user.id as any, id)'],
    [/remove\(user\.id,\s*id\)/g, 'remove(user.id as any, id)'],
]);

// 3. expert bank accounts facade
replaceFile('src/modules/expert/bank-accounts/application/bank-accounts.facade.ts', [
    [/userId:\s*number/g, 'userId: string'],
    [/accountId:\s*number/g, 'accountId: string'],
    [/id:\s*number/g, 'id: string']
]);

// 4. get-earnings-stats.use-case.ts
replaceFile('src/modules/expert/earnings/application/use-cases/get-earnings-stats.use-case.ts', [
    [/userId as any as any/g, 'userId as any']
]);

// 5. get-wallet-transactions.use-case.ts
replaceFile('src/modules/expert/earnings/application/use-cases/get-wallet-transactions.use-case.ts', [
    [/userId:\s*number/g, 'userId: string']
]);

// 6. create-profile.usecase.ts
replaceFile('src/modules/expert/profile/application/use-cases/create-profile.usecase.ts', [
    [/user\.id as any/g, 'user.id as any as string']
]);

// 7. merchant-dashboard.controller.ts
replaceFile('src/modules/merchant/dashboard/api/controllers/merchant-dashboard.controller.ts', [
    [/userId,\s*orderId/g, 'userId as any, orderId'],
    [/userId\s*\)/g, 'userId as any)']
]);

// 8. merchant-products.controller.ts
replaceFile('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', [
    [/findAll\(userId,/g, 'findAll(userId as any,'],
    [/findOne\(userId,/g, 'findOne(userId as any,'],
    [/create\(userId,/g, 'create(userId as any,'],
    [/bulkUpdateStatus\(userId,/g, 'bulkUpdateStatus(userId as any,'],
    [/update\(userId,/g, 'update(userId as any,'],
    [/remove\(userId,/g, 'remove(userId as any,']
]);

// 9. get-all-merchants.use-case.ts
replaceFile('src/modules/merchant/profile/application/use-cases/get-all-merchants.use-case.ts', [
    [/m\.user_id\s+as\s+any\s+as\s+string/g, 'm.user_id as any'],
    [/m\.user_id\s+as\s+any/g, 'm.user_id as any as string']
]);

// 10. users.facade.ts
replaceFile('src/modules/users/application/users.facade.ts', [
    [/id:\s*number/g, 'id: string']
]);

// 11. credit.use-case.ts
replaceFile('src/modules/wallet/application/use-cases/credit.use-case.ts', [
    [/walletOwnerId;\s*wallet\[queryKey\]\s*=\s*walletOwnerId;\s*wallet\.balance\s*=\s*0;\s*wallet\.reserved_balance\s*=\s*0;/g, 'walletOwnerId;'],
    [/let wallet:\s*Wallet\s*\|\s*null;/g, 'let wallet: Wallet | null = null;'],
    [/wallet = new Wallet\(\); \/\/ qr\.manager\.create\(Wallet/g, 'wallet = qr.manager.create(Wallet, { [queryKey]: walletOwnerId, balance: 0, reserved_balance: 0 } as any);']
]);

// 12. debit.use-case.ts
replaceFile('src/modules/wallet/application/use-cases/debit.use-case.ts', [
    [/clientProfile = new ProfileClient\(\);\s*clientProfile\.id\s*=\s*walletOwnerId\s*as\s*any;/g, 'clientProfile = qr.manager.create(ProfileClient, { id: walletOwnerId } as any);']
]);

// 13. deduct-from-reserved.use-case.ts
replaceFile('src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts', [
    [/clientProfile = new ProfileClient\(\);\s*clientProfile\.id\s*=\s*walletOwnerId\s*as\s*any;/g, 'clientProfile = qr.manager.create(ProfileClient, { id: walletOwnerId } as any);']
]);

// 14. get-pending-withdrawals.use-case.ts
replaceFile('src/modules/wallet/application/use-cases/get-pending-withdrawals.use-case.ts', [
    [/w\.client\?\.user\?\.name/g, '(w as any).client?.user?.name'],
    [/w\.client\?\.user\?\.phone/g, '(w as any).client?.user?.phone']
]);

// 15. request-withdrawal.use-case.ts
replaceFile('src/modules/wallet/application/use-cases/request-withdrawal.use-case.ts', [
    [/userId:\s*number/g, 'userId: string']
]);

// 16. update-withdrawal-status.use-case.ts
replaceFile('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', [
    [/withdrawal\.wallet\.client_id\s*as\s*any/g, 'withdrawal.wallet.client_id as any as number'],
    [/WithdrawalUpdatedEvent\(userId\s*as\s*any/g, 'WithdrawalUpdatedEvent(withdrawal.wallet.client_id as any as string'] // user id is wrong here
]);

// 17. wallet.facade.ts
replaceFile('src/modules/wallet/application/wallet.facade.ts', [
    [/userId:\s*string/g, 'userId: string | undefined'],
    [/limit:\s*number/g, 'limit: number | undefined'],
    [/offset:\s*number/g, 'offset: number | undefined'],
    [/type:\s*string/g, 'type: string | undefined']
]);

console.log('Script completed');
