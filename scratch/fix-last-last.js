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

fix('src/modules/merchant/dashboard/api/controllers/merchant-products.controller.ts', [
    [/\+id/g, 'id as any'],
    [/\+status/g, 'status as any'],
    [/update\(\+id/g, 'update(id as any'],
    [/remove\(\+id/g, 'remove(id as any'],
    [/updateStatus\(\+id/g, 'updateStatus(id as any']
]);

fix('src/modules/merchant/dashboard/application/use-cases/get-merchant-finance-stats.usecase.ts', [
    [/getWallet\(userId\)/g, 'getWallet(userId as any)'],
    [/getBalance\(userId\)/g, 'getBalance(userId as any)']
]);

fix('src/modules/merchant/dashboard/application/use-cases/merchant-products.usecase.ts', [
    [/merchant_id:\s*merchantId\s*as\s*any,/g, 'merchant_id: merchantId as any as string,'],
    [/this\.productRepo\.create\({/g, 'this.productRepo.create({ ...dto, '],
    [/this\.toResponse\(saved\s*as\s*Product\)/g, 'this.toResponse(saved as any)']
]);

fix('src/modules/merchant/dashboard/application/use-cases/send-order-otp.usecase.ts', [
    [/order\.client_id/g, 'order.client_id as any']
]);

fix('src/modules/merchant/profile/application/use-cases/get-all-merchants.use-case.ts', [
    [/m\.user_id\s*as\s*any/g, 'm.user_id as any as string']
]);

fix('src/modules/merchant/profile/application/use-cases/update-merchant-profile.use-case.ts', [
    [/notifyStatusChange\(profile\.id\s*as\s*any,/g, 'notifyStatusChange(profile.id as any as string,']
]);

fix('src/modules/puja-appointment/application/use-cases/update-puja-appointment-status.use-case.ts', [
    [/appointment\.expert\.user_id\s*as\s*any/g, 'appointment.expert.user_id as any as string'],
    [/appointment\.client_id\s*as\s*any/g, 'appointment.client_id as any as string']
]);

fix('src/modules/support/application/use-cases/send-message.use-case.ts', [
    [/userId:\s*string\s*=\s*""/g, 'userId: string'],
    [/senderId:\s*string\s*=\s*""/g, 'senderId: string']
]);

fix('src/modules/users/application/use-cases/create-user.usecase.ts', [
    [/uid:\s*string\s*=\s*"";/g, 'uid: string | null = null;'],
    [/user\.uid\s*=\s*uid;/g, '']
]);

fix('src/modules/users/application/users.facade.ts', [
    [/assignRole\(id:\s*number,/g, 'assignRole(id: string,'],
    [/update\(id:\s*number,/g, 'update(id: string,'],
    [/delete\(id:\s*number\)/g, 'delete(id: string)'],
    [/findById\(id:\s*number\)/g, 'findById(id: string)']
]);

fix('src/modules/wallet/application/use-cases/credit.use-case.ts', [
    [/wallet\s*=\s*qr\.manager\.create\(Wallet,\s*{\s*\[queryKey\]:\s*walletOwnerId,\s*balance:\s*0,\s*reserved_balance:\s*0\s*}\s*as\s*any\);/g, 'wallet = new Wallet(); wallet[queryKey as keyof Wallet] = walletOwnerId as any; wallet.balance = 0; wallet.reserved_balance = 0;']
]);

fix('src/modules/wallet/application/use-cases/debit.use-case.ts', [
    [/clientProfile\s*=\s*qr\.manager\.create\(ProfileClient,\s*{\s*client_id:\s*walletOwnerId\s*}\);/g, 'clientProfile = new ProfileClient(); clientProfile.id = walletOwnerId;']
]);

fix('src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts', [
    [/clientProfile\s*=\s*qr\.manager\.create\(ProfileClient,\s*{\s*client_id:\s*walletOwnerId\s*}\);/g, 'clientProfile = new ProfileClient(); clientProfile.id = walletOwnerId;']
]);

fix('src/modules/wallet/application/use-cases/get-pending-withdrawals.use-case.ts', [
    [/w\.user\?\.name/g, 'w.client?.user?.name'],
    [/w\.user\?\.phone/g, 'w.client?.user?.phone']
]);

fix('src/modules/wallet/application/use-cases/get-withdrawals.use-case.ts', [
    [/where:\s*{\s*client_id:\s*userId\s*as\s*any\s*}/g, 'where: { wallet: { client_id: userId as any } } as any']
]);

fix('src/modules/wallet/application/use-cases/request-withdrawal.use-case.ts', [
    [/WithdrawalUpdatedEvent\(userId\s*as\s*any,/g, 'WithdrawalUpdatedEvent(userId as any as string,']
]);

fix('src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts', [
    [/WithdrawalUpdatedEvent\(userId\s*as\s*any,/g, 'WithdrawalUpdatedEvent(userId as any as string,'],
    [/WithdrawalUpdatedEvent\(withdrawal\.wallet\.client_id\s*as\s*any,/g, 'WithdrawalUpdatedEvent(withdrawal.wallet.client_id as any as string,']
]);

fix('src/modules/wallet/application/wallet.facade.ts', [
    [/getBalance\(userId:\s*number\)/g, 'getBalance(userId: string)'],
    [/getWallet\(userId:\s*number\)/g, 'getWallet(userId: string)'],
    [/credit\(userId:\s*number,/g, 'credit(userId: string,'],
    [/debit\(userId:\s*number,/g, 'debit(userId: string,'],
    [/requestWithdrawal\(userId:\s*number,/g, 'requestWithdrawal(userId: string,'],
    [/getTransactions\(userId:\s*number,/g, 'getTransactions(userId: string,'],
    [/getWithdrawals\(userId:\s*number,/g, 'getWithdrawals(userId: string,'],
    [/reserveBalance\(userId:\s*number,/g, 'reserveBalance(userId: string,'],
    [/deductFromReserved\(userId:\s*number,/g, 'deductFromReserved(userId: string,'],
    [/releaseReserved\(userId:\s*number,/g, 'releaseReserved(userId: string,'],
    [/reconcileWallet\(userId:\s*number\)/g, 'reconcileWallet(userId: string)'],
    [/getTotalEarnings\(userId:\s*number,/g, 'getTotalEarnings(userId: string,']
]);
