const fs = require('fs');
const glob = require('glob');
const path = require('path');

function fixFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [pattern, replacement] of replacements) {
        content = content.replace(pattern, replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${filePath}`);
    }
}

// 1. Fix Bank Account Use Cases
glob.sync('src/modules/expert/bank-accounts/application/use-cases/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/where:\s*{\s*user:\s*{\s*id:\s*userId\s*}\s*}/g, 'where: { user: { id: userId as any } }'],
        [/new\s+BankAccountCreatedEvent\(userId,/g, 'new BankAccountCreatedEvent(userId as any,'],
        [/new\s+PrimaryBankAccountChangedEvent\(userId,/g, 'new PrimaryBankAccountChangedEvent(userId as any,'],
        [/new\s+BankAccountUpdatedEvent\(userId,/g, 'new BankAccountUpdatedEvent(userId as any,']
    ]);
});

// 2. Fix Dashboard Use Cases
glob.sync('src/modules/expert/dashboard/application/use-cases/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/expertId:\s*number/g, 'expertId: string'],
        [/getReviewsStats\(expertId\)/g, 'getReviewsStats(expertId as any)'],
        [/getExpertSessionCount\(expertId/g, 'getExpertSessionCount(expertId as any'],
        [/getBalance\(userId\)/g, 'getBalance(userId as any)']
    ]);
});

// 3. Fix Earnings Controllers & Use Cases
glob.sync('src/modules/expert/earnings/**/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/getStats\(user\.id/g, 'getStats(user.id as any'],
        [/getWalletBalance\(user\.id\)/g, 'getWalletBalance(user.id as any)'],
        [/getTransactions\(user\.id/g, 'getTransactions(user.id as any'],
        [/where:\s*{\s*user:\s*{\s*id:\s*userId\s*}\s*}/g, 'where: { user: { id: userId as any } }'],
        [/updateTopUser\(s\.user_id,\s*s\.total_cost\s*\|\|\s*0,\s*s\.user\)/g, 'updateTopUser(s.expert_id as any, s.total_cost || 0, s.expert as any)'],
        [/updateTopUser\(c\.user_id,\s*c\.final_price\s*\|\|\s*0,\s*c\.user\)/g, 'updateTopUser(c.expert_id as any, c.final_price || 0, c.expert as any)'],
        [/updateTopUser\(p\.client\?\.user_id\s*\|\|\s*0,\s*Number\(p\.price\)\s*\|\|\s*0,\s*p\.client\?\.user\)/g, 'updateTopUser(p.client?.id as any, Number(p.price) || 0, p.client?.user as any)'],
        [/getBalance\(userId\)/g, 'getBalance(userId as any)'],
        [/getTransactions\(userId,/g, 'getTransactions(userId as any,'],
        [/requestWithdrawal\(userId,/g, 'requestWithdrawal(userId as any,']
    ]);
});

// 4. Fix Expert Profile
glob.sync('src/modules/expert/profile/**/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/where:\s*{\s*user:\s*{\s*id:\s*userId\s*}\s*}/g, 'where: { user: { id: userId as any } }'],
        [/where:\s*{\s*id:\s*event\.userId\s*}/g, 'where: { id: event.userId as any }'],
        [/new\s+ProfileUpdatedEvent\(user\.id,/g, 'new ProfileUpdatedEvent(user.id as any,'],
        [/new\s+ExpertStatusChangedEvent\(user\.id,/g, 'new ExpertStatusChangedEvent(user.id as any,'],
        [/isExpertOnline\(expert\.user\.id\)/g, 'isExpertOnline(expert.user.id as any)'],
        [/isExpertOnline\(profile\.user\.id\)/g, 'isExpertOnline(profile.user.id as any)'],
        [/isExpertOnline\(ex\.user\.id\)/g, 'isExpertOnline(ex.user.id as any)'],
        [/where:\s*{\s*id,\s*expert_id:\s*profile\.id\s*}/g, 'where: { id: id as any, expert_id: profile.id }'],
        [/where:\s*{\s*id:\s*Number\(expertId\)\s*}/g, 'where: { id: expertId as any }'],
        [/where:\s*{\s*user:\s*{\s*id:\s*Number\(expertId\)\s*}\s*}/g, 'where: { user: { id: expertId as any } }'],
        [/new\s+KycStatusChangedEvent\(user!\.id,/g, 'new KycStatusChangedEvent(user!.id as any,'],
        [/getExpertSessionCount\(profile\.id/g, 'getExpertSessionCount(profile.id as any']
    ]);
});

// 5. Fix Expert Todos
glob.sync('src/modules/expert/todos/**/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/findAll\(user\.id\)/g, 'findAll(user.id as any)'],
        [/create\(user\.id,/g, 'create(user.id as any,'],
        [/update\(user\.id,/g, 'update(user.id as any,'],
        [/remove\(user\.id,/g, 'remove(user.id as any,'],
        [/where:\s*{\s*user:\s*{\s*id:\s*userId\s*}\s*}/g, 'where: { user: { id: userId as any } }']
    ]);
});

// 6. Fix Festival
glob.sync('src/modules/festival/**/*.ts').forEach(file => {
    fixFile(file, [
        [/findOne\(\+id\)/g, 'findOne(id as any)'],
        [/update\(\+id,\s*dto\)/g, 'update(id as any, dto)'],
        [/remove\(\+id\)/g, 'remove(id as any)']
    ]);
});

// 7. Fix Merchant Dashboard
glob.sync('src/modules/merchant/dashboard/**/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/merchantUserId:\s*number/g, 'merchantUserId: string'],
        [/requestWithdrawal\(userId,/g, 'requestWithdrawal(userId as any,'],
        [/where:\s*{\s*user_id:\s*userId\s*}/g, 'where: { id: userId as any }'],
        [/getWallet\(userId\)/g, 'getWallet(userId as any)'],
        [/order\.user\?\.name/g, 'order.client?.user?.name'],
        [/where:\s*{\s*merchant_id:\s*userId\s*}/g, 'where: { merchant_id: userId as any }'],
        [/where:\s*{\s*id:\s*withdrawalId\s*}/g, 'where: { id: withdrawalId as any }'],
        [/this\.productRepo\.create\({\s*merchant_id:\s*merchantId/g, 'this.productRepo.create({ merchant_id: merchantId as any'],
        [/findOneBy\({ id: productId }\)/g, 'findOneBy({ id: productId as any })'],
        [/existing\.merchant_id !== merchantId/g, 'existing.merchant_id !== (merchantId as any)'],
        [/where:\s*{\s*id:\s*In\(ids\),\s*merchant_id:\s*merchantId\s*}/g, 'where: { id: In(ids), merchant_id: merchantId as any }'],
        [/p\.merchant_id !== merchantId/g, 'p.merchant_id !== (merchantId as any)'],
        [/where:\s*{\s*id:\s*orderId\s*}/g, 'where: { id: orderId as any }'],
        [/product\?\.merchant_id === merchantId/g, 'product?.merchant_id === (merchantId as any)'],
        [/order\.user_id/g, 'order.client_id'],
        [/emitToUser\(order\.user_id,/g, 'emitToUser(order.client_id as any,'],
        [/where:\s*{\s*id:\s*order\.user_id\s*}/g, 'where: { id: order.client_id as any }'],
        [/product\.merchant_id === merchantUserId/g, 'product.merchant_id === (merchantUserId as any)'],
        [/updateOrderStatus\(orderId,\s*OrderStatus\.DELIVERED,\s*undefined,\s*merchantUserId\)/g, 'updateOrderStatus(orderId as any, OrderStatus.DELIVERED, undefined, merchantUserId as any)']
    ]);
});

// 8. Fix Merchant Profile
glob.sync('src/modules/merchant/profile/**/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*number/g, 'userId: string'],
        [/m\.user_id/g, '(m.user_id as any)'],
        [/where:\s*{\s*user:\s*{\s*id:\s*currentUserId\s*},\s*merchant:\s*{\s*id:\s*In\(merchants\.map\(m => m\.id\)\)\s*}\s*}/g, 'where: { client: { user: { id: currentUserId as any } }, merchant: { id: In(merchants.map(m => m.id)) } }'],
        [/where:\s*{\s*user:\s*{\s*id:\s*currentUserId\s*},\s*merchant:\s*{\s*id:\s*merchant\.id\s*}\s*}/g, 'where: { client: { user: { id: currentUserId as any } }, merchant: { id: merchant.id as any } }'],
        [/new\s+Set<\s*number\s*>\(\)/g, 'new Set<string>()'],
        [/get\(m\.id\)/g, 'get(m.id as any)'],
        [/has\(m\.id\)/g, 'has(m.id as any)'],
        [/where:\s*{\s*user_id:\s*Number\(userId\)\s*}/g, 'where: { user: { id: userId as any } }'],
        [/user_id:\s*Number\(userId\),/g, 'user: { id: userId as any },'],
        [/update\(userId,\s*{\s*avatar:\s*uploadResult\.secure_url\s*}\)/g, 'update(userId as any, { avatar: uploadResult.secure_url })'],
        [/update\(userId,\s*{\s*name:\s*newName\s*}\)/g, 'update(userId as any, { name: newName })'],
        [/notifyStatusChange\(profile\.id,\s*profile\.isOnline\)/g, 'notifyStatusChange(profile.id as any, profile.isOnline)']
    ]);
});

// 9. Fix Notification
glob.sync('src/modules/notification/**/*.ts').forEach(file => {
    fixFile(file, [
        [/getUserNotifications\(user\.id,/g, 'getUserNotifications(user.id as any,'],
        [/getUnreadCount\(user\.id\)/g, 'getUnreadCount(user.id as any)'],
        [/markAsRead\(id,\s*user\.id\)/g, 'markAsRead(id as any, user.id as any)'],
        [/clearAll\(user\.id\)/g, 'clearAll(user.id as any)'],
        [/delete\({\s*user_id:\s*userId\s*}\)/g, 'delete({ client_id: userId as any })'],
        [/user_id:\s*userId,/g, 'client_id: userId as any,'],
        [/where:\s*{\s*user_id:\s*userId\s*}/g, 'where: { client_id: userId as any }'],
        [/where:\s*{\s*user_id:\s*userId,\s*is_read:\s*false\s*}/g, 'where: { client_id: userId as any, is_read: false }'],
        [/{\s*is_read:\s*true,\s*read_at:\s*new\s+Date\(\)\s*}/g, '{ is_read: true }']
    ]);
});

// 10. Fix Puja Appointment
glob.sync('src/modules/puja-appointment/**/*.ts').forEach(file => {
    fixFile(file, [
        [/expertProfile\.user_id,/g, 'expertProfile.user_id as any,'],
        [/notifyNewPujaBooking\(expertProfile\.user_id,/g, 'notifyNewPujaBooking(expertProfile.user_id as any,'],
        [/create\(appointment\.expert\.user_id,/g, 'create(appointment.expert.user_id as any,'],
        [/notifyPujaCompleted\(appointment\.client_id,/g, 'notifyPujaCompleted(appointment.client_id as any,']
    ]);
});

// 11. Fix Support
glob.sync('src/modules/support/**/*.ts').forEach(file => {
    fixFile(file, [
        [/userId:\s*string\s*\|\s*null/g, 'userId: string'],
        [/senderId:\s*string\s*\|\s*null/g, 'senderId: string'],
        [/dispute\.user_id/g, 'dispute.client_id']
    ]);
});

// 12. Fix Users
glob.sync('src/modules/users/**/*.ts').forEach(file => {
    fixFile(file, [
        [/assignRole\(id,/g, 'assignRole(id as any,'],
        [/@Param\\('id'\\)/g, "@Param('id', ParseUUIDPipe)"],
        [/findById\(id\)/g, 'findById(id as any)'],
        [/update\(id,/g, 'update(id as any,'],
        [/delete\(id\)/g, 'delete(id as any)']
    ]);
    if(file.includes('users.controller.ts')){
        let code = fs.readFileSync(file, 'utf8');
        if(!code.includes('ParseUUIDPipe')) {
            code = code.replace(/import {([^}]+)} from '@nestjs\/common';/, "import { ParseUUIDPipe, $1 } from '@nestjs/common';");
            fs.writeFileSync(file, code, 'utf8');
        }
    }
});
