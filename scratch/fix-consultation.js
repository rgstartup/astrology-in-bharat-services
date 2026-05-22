const fs = require('fs');
const path = require('path');

function walkSync(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walkSync(filepath, callback);
        } else if (filepath.endsWith('.ts')) {
            callback(filepath);
        }
    }
}

const replacements = [
    [/userId:\s*number/g, 'userId: string'],
    [/expertId:\s*number/g, 'expertId: string'],
    [/merchantId:\s*number/g, 'merchantId: string'],
    [/sessionId:\s*number/g, 'sessionId: string'],
    [/session\.user_id/g, 'session.client_id'],
    [/\{ user_id: userId \}/g, '{ client_id: userId }'],
    [/\{ user_id: userId,/g, '{ client_id: userId,'],
    [/user_id:\s*userId\s*\|\|\s*''/g, 'client_id: userId || ""'],
    [/\.user\?/g, '.client?'],
    [/user:\s*r\.user\s*\?/g, 'client: r.client ?'],
    [/\.\.\.r\.user,/g, '...r.client,'],
    [/(r\.user as any)/g, '(r.client as any)'],
    [/\{ id: userId \}/g, '{ id: userId as any }'],
    [/\{ id: expertId \}/g, '{ id: expertId as any }'],
    [/\{ id: merchantId \}/g, '{ id: merchantId as any }'],
    [/\{ id: sessionId \}/g, '{ id: sessionId as any }'],
    [/\{ id: orderId/g, '{ id: orderId as any'],
    [/\{ expert_id: expertId \}/g, '{ expert_id: expertId as any }'],
    [/\{ merchant_id: merchantId/g, '{ merchant_id: merchantId as any'],
    [/\{ session_id: sessionId/g, '{ session_id: sessionId as any'],
    [/\{ client_id: expertId \}/g, '{ client_id: expertId as any }'],
    [/client_id: userId,/g, 'client_id: userId as any,'],
    [/user\.id\s*,\s*ExpertSessionFilter/g, 'user.id as any, ExpertSessionFilter'],
    [/user\.id\s*,\s*dto/g, 'user.id as any, dto'],
    [/user\.id\s*,\s*id/g, 'user.id as any, id'],
    [/user\.id\s*,\s*productId/g, 'user.id as any, productId'],
    [/user\.id\s*\)/g, 'user.id as any)'],
    [/user\.id\s*,\s*expert_id/g, 'user.id as any, expert_id as any'],
    [/\{ user: \{\s*id:\s*session\.user_id\s*\} \}/g, '{ id: session.client_id as any }'],
    [/\{ user: \{\s*id:\s*userId\s*\} \}/g, '{ id: userId as any }'],
];

walkSync('src/modules/consultation', (filepath) => {
    let content = fs.readFileSync(filepath, 'utf8');
    let old = content;
    for (const [find, replace] of replacements) {
        content = content.replace(find, replace);
    }
    if (content !== old) {
        fs.writeFileSync(filepath, content);
        console.log(`Replaced in ${filepath}`);
    }
});
