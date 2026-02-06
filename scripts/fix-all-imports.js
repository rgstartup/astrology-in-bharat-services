const fs = require('fs');
const path = require('path');

const replacementMap = {
    // Entities
    'User': '@/modules/users/domain/entities/user.entity',
    'Role': '@/modules/role/domain/entities/roles.entity',
    'ProfileClient': '@/modules/client/domain/entities/profile-client.entity',
    'ProfileExpert': '@/modules/expert/domain/entities/profile-expert.entity',
    'ChatSession': '@/modules/chat/domain/entities/chat-session.entity',
    'ChatMessage': '@/modules/chat/domain/entities/chat-message.entity',
    'Wallet': '@/modules/wallet/domain/entities/wallet.entity',
    'Transaction': '@/modules/wallet/domain/entities/transaction.entity',
    'Order': '@/modules/order/domain/entities/order.entity',
    'Product': '@/modules/product/domain/entities/product.entity',
    'Review': '@/modules/reviews/domain/entities/review.entity',
    'UserCoupon': '@/modules/coupon/domain/entities/user-coupon.entity',
    'Coupon': '@/modules/coupon/domain/entities/coupon.entity',
    'Notification': '@/modules/notification/domain/entities/notification.entity',
    'Cart': '@/modules/cart/domain/entities/cart.entity',
    'Credential': '@/modules/auth/domain/entities/credential.entity',
    'OAuthAccount': '@/modules/auth/domain/entities/oauth-accounts.entity',
    'UsedTokens': '@/modules/auth/domain/entities/used-tokens.entity',

    // Services
    'UsersService': '@/modules/users/application/services/users.service',
    'RolesService': '@/modules/role/application/services/roles.service',
    'ClientProfileService': '@/modules/client/application/services/client-profile.service',
    'ProfileService': '@/modules/expert/application/services/profile.service',
    'ChatService': '@/modules/chat/application/services/chat.service',
    'WalletService': '@/modules/wallet/application/services/wallet.service',
    'AuthService': '@/modules/auth/application/services/auth.service',
    'TokenService': '@/modules/auth/application/services/token.service',
    'MailService': '@/modules/notification/application/services/mail.service',
    'NotificationService': '@/modules/notification/application/services/notification.service',
};

const moduleIndexPatterns = [
    '@/modules/users',
    '@/modules/role',
    '@/modules/client',
    '@/modules/expert',
    '@/modules/coupon',
    '@/modules/auth',
    '@/modules/chat',
    '@/modules/wallet',
    '@/modules/order',
    '@/modules/product',
    '@/modules/reviews',
    '@/modules/wishlist',
    '@/modules/notification',
    '@/modules/cart'
];

function fixImports(content) {
    let lines = content.split('\n');
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim().startsWith('import') && line.includes('from \'@/modules/') && !line.includes('.entity')) {
            let match = line.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+'([^']+)'/);
            if (match) {
                let symbols = match[1].split(',').map(s => s.trim());
                let fromPath = match[2];

                if (moduleIndexPatterns.includes(fromPath)) {
                    let moveMap = {}; // path -> [symbols]
                    let stay = [];

                    symbols.forEach(symbol => {
                        if (replacementMap[symbol]) {
                            let newPath = replacementMap[symbol];
                            if (!moveMap[newPath]) moveMap[newPath] = [];
                            moveMap[newPath].push(symbol);
                        } else {
                            stay.push(symbol);
                        }
                    });

                    if (Object.keys(moveMap).length > 0) {
                        let newLines = [];
                        if (stay.length > 0) {
                            newLines.push(`import { ${stay.join(', ')} } from '${fromPath}';`);
                        }
                        for (const [newPath, moveSymbols] of Object.entries(moveMap)) {
                            newLines.push(`import { ${moveSymbols.join(', ')} } from '${newPath}';`);
                        }
                        lines[i] = newLines.join('\n');
                        changed = true;
                    }
                }
            }
        }
    }

    return changed ? lines.join('\n') : content;
}

function processFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // First, try to "clean" duplicate imports introduced by previous run
    // A simple regex-based cleaner for identical import lines
    let lines = content.split('\n');
    let seen = new Set();
    let uniqueLines = [];
    let deduplicated = false;
    for (const line of lines) {
        let trimmed = line.trim();
        if (trimmed.startsWith('import') && seen.has(trimmed)) {
            deduplicated = true;
            continue;
        }
        if (trimmed.startsWith('import')) seen.add(trimmed);
        uniqueLines.push(line);
    }

    let currentContent = deduplicated ? uniqueLines.join('\n') : content;
    let newContent = fixImports(currentContent);

    if (newContent !== content || deduplicated) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Fixed/Deduplicated imports in ${fullPath}`);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    });
}

walk(path.join(__dirname, '..', 'src', 'modules'));
