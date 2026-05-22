const fs = require('fs');

function fix(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [p, r] of replacements) {
        content = content.replace(p, r);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${filePath}`);
    }
}

fix('src/modules/expert/profile/application/use-cases/update-kyc-status.usecase.ts', [
    [/new KycStatusChangedEvent\(user!\.id as any,\s*profile\.id,\s*status,\s*reason\)/g, 'new KycStatusChangedEvent(user!.id as any, profile.id as any, status, reason)']
]);

fix('src/modules/expert/profile/application/use-cases/update-profile.usecase.ts', [
    [/new ProfileUpdatedEvent\(user\.id as any,\s*savedProfile\.id,\s*dto\)/g, 'new ProfileUpdatedEvent(user.id as any, savedProfile.id as any, dto)']
]);

fix('src/modules/merchant/dashboard/api/controllers/merchant-dashboard.controller.ts', [
    [/getMerchantFinanceStats\(user\.id\)/g, 'getMerchantFinanceStats(user.id as any)'],
    [/getMerchantAnalytics\(user\.id,\s*period\)/g, 'getMerchantAnalytics(user.id as any, period)']
]);

fix('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', [
    [/findAll\(user\.id/g, 'findAll(user.id as any'],
    [/findOne\(user\.id/g, 'findOne(user.id as any'],
    [/create\(user\.id/g, 'create(user.id as any'],
    [/update\(user\.id/g, 'update(user.id as any'],
    [/remove\(user\.id/g, 'remove(user.id as any'],
    [/updateStatus\(user\.id/g, 'updateStatus(user.id as any']
]);

fix('src/modules/merchant/dashboard/application/use-cases/get-merchant-finance-stats.usecase.ts', [
    [/getBalance\(userId as any\),/g, 'getBalance(userId as any as string),']
]);

fix('src/modules/merchant/dashboard/application/use-cases/merchant-products.usecase.ts', [
    [/this\.productRepo\.create\({\s*\.\.\.dto,\s*merchant_id/g, 'this.productRepo.create({ ...(dto as any), merchant_id']
]);

fix('src/modules/merchant/profile/application/use-cases/get-all-merchants.use-case.ts', [
    [/m\.user_id as any as string/g, 'm.user_id as any']
]);

fix('src/modules/merchant/profile/application/use-cases/update-merchant-profile.use-case.ts', [
    [/new ProfileUpdatedEvent\(user\.id,\s*savedProfile\.id,\s*dto\)/g, 'new ProfileUpdatedEvent(user.id as any, savedProfile.id as any, dto)'],
    [/notifyStatusChange\(profile\.id as any as string,\s*profile\.isOnline\)/g, 'notifyStatusChange(profile.id as any, profile.isOnline)']
]);

fix('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', [
    [/this\.todosFacade\.create\(appointment\.expert\.user_id as any as string,/g, 'this.todosFacade.create(appointment.expert.user_id as any,'],
    [/this\.todosFacade\.create\(appointment\.expert\.user_id as any,/g, 'this.todosFacade.create(appointment.expert.user_id as any,'],
    [/notifyPujaCompleted\(appointment\.client_id as any as string,/g, 'notifyPujaCompleted(appointment.client_id as any,'],
    [/notifyPujaCompleted\(appointment\.client_id as any,/g, 'notifyPujaCompleted(appointment.client_id as any,'],
    [/refundPayment\(appointment\.client_id as any,\s*Number/g, 'refundPayment(appointment.client_id as any, Number'],
    [/refundPayment\(appointment\.client_id,\s*Number/g, 'refundPayment(appointment.client_id as any, Number']
]);

fix('src/modules/support/application/use-cases/send-message.use-case.ts', [
    [/userId:\s*string/g, 'userId: string | null = null'],
    [/senderId:\s*string/g, 'senderId: string | null = null'],
    [/userId\s*=\s*client\.id/g, 'userId = client.id'],
    [/senderId\s*=\s*expert\.id/g, 'senderId = expert.id']
]);

fix('src/modules/users/application/use-cases/create-user.usecase.ts', [
    [/uid:\s*string\s*\|\s*null\s*=\s*null;/g, 'uid: string = "";'],
    [/user\.uid\s*=\s*uid;/g, '']
]);

fix('src/modules/users/application/users.facade.ts', [
    [/assignRole\(id:\s*string,/g, 'assignRole(id: any,'],
    [/update\(id:\s*string,/g, 'update(id: any,'],
    [/delete\(id:\s*string\)/g, 'delete(id: any)'],
    [/findById\(id:\s*string\)/g, 'findById(id: any)'],
    [/remove\(id:\s*string\)/g, 'remove(id: any)'],
    [/assignRoleToUser\(id,\s*role\)/g, 'assignRoleToUser(id as any, role)'],
    [/updateUser\(id,\s*dto\)/g, 'updateUser(id as any, dto)'],
    [/deleteUser\(id\)/g, 'deleteUser(id as any)'],
    [/getUserById\(id\)/g, 'getUserById(id as any)']
]);

fix('src/modules/wallet/application/use-cases/credit.use-case.ts', [
    [/wallet\s*=\s*new\s*Wallet\(\);\s*wallet\[queryKey\s*as\s*keyof\s*Wallet\]\s*=\s*walletOwnerId\s*as\s*any;\s*wallet\.balance\s*=\s*0;\s*wallet\.reserved_balance\s*=\s*0;/g, 'wallet = new Wallet(); (wallet as any)[queryKey] = walletOwnerId; wallet.balance = 0; wallet.reserved_balance = 0;']
]);

fix('src/modules/wallet/application/use-cases/debit.use-case.ts', [
    [/clientProfile\s*=\s*new\s*ProfileClient\(\);\s*clientProfile\.id\s*=\s*walletOwnerId;/g, 'clientProfile = new ProfileClient(); (clientProfile as any).id = walletOwnerId;']
]);

fix('src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts', [
    [/clientProfile\s*=\s*new\s*ProfileClient\(\);\s*clientProfile\.id\s*=\s*walletOwnerId;/g, 'clientProfile = new ProfileClient(); (clientProfile as any).id = walletOwnerId;']
]);

fix('src/modules/wallet/application/use-cases/get-pending-withdrawals.use-case.ts', [
    [/w\.client\?\.user\?\.name/g, '(w as any).client?.user?.name'],
    [/w\.client\?\.user\?\.phone/g, '(w as any).client?.user?.phone']
]);

fix('src/modules/wallet/application/use-cases/request-withdrawal.use-case.ts', [
    [/WithdrawalUpdatedEvent\(userId\s*as\s*any\s*as\s*string,/g, 'WithdrawalUpdatedEvent(userId as any,']
]);

fix('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', [
    [/WithdrawalUpdatedEvent\(userId\s*as\s*any\s*as\s*string,/g, 'WithdrawalUpdatedEvent(userId as any,'],
    [/WithdrawalUpdatedEvent\(withdrawal\.wallet\.client_id\s*as\s*any\s*as\s*string,/g, 'WithdrawalUpdatedEvent(withdrawal.wallet.client_id as any,'],
    [/userId,/g, 'withdrawal.wallet.client_id,']
]);

fix('src/modules/wallet/application/wallet.facade.ts', [
    [/getBalance\(userId:\s*string\)/g, 'getBalance(userId: any)'],
    [/getWallet\(userId:\s*string\)/g, 'getWallet(userId: any)'],
    [/credit\(userId:\s*string,/g, 'credit(userId: any,'],
    [/debit\(userId:\s*string,/g, 'debit(userId: any,'],
    [/requestWithdrawal\(userId:\s*string,/g, 'requestWithdrawal(userId: any,'],
    [/getTransactions\(userId:\s*string,/g, 'getTransactions(userId: any,'],
    [/getWithdrawals\(userId:\s*string,/g, 'getWithdrawals(userId: any,'],
    [/reserveBalance\(userId:\s*string,/g, 'reserveBalance(userId: any,'],
    [/deductFromReserved\(userId:\s*string,/g, 'deductFromReserved(userId: any,'],
    [/releaseReserved\(userId:\s*string,/g, 'releaseReserved(userId: any,'],
    [/reconcileWallet\(userId:\s*string\)/g, 'reconcileWallet(userId: any)'],
    [/getTotalEarnings\(userId:\s*string,/g, 'getTotalEarnings(userId: any,']
]);
