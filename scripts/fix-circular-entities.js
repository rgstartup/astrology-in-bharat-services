const fs = require('fs');
const path = require('path');

const entityMap = {
    'User': '@/modules/users/domain/entities/user.entity',
    'Role': '@/modules/role/domain/entities/roles.entity',
    'ProfileClient': '@/modules/client/domain/entities/profile-client.entity',
    'ProfileExpert': '@/modules/expert/domain/entities/profile-expert.entity',
    'UserCoupon': '@/modules/coupon/domain/entities/user-coupon.entity',
    'OAuthAccount': '@/modules/auth/domain/entities/oauth-accounts.entity',
    'Credential': '@/modules/auth/domain/entities/credential.entity',
    'UsedTokens': '@/modules/auth/domain/entities/used-tokens.entity',
    'Address': '@/common/domain/entities/address.entity',
    'ChatSession': '@/modules/chat/domain/entities/chat-session.entity',
    'ChatMessage': '@/modules/chat/domain/entities/chat-message.entity',
    'Wallet': '@/modules/wallet/domain/entities/wallet.entity',
    'Transaction': '@/modules/wallet/domain/entities/transaction.entity',
    'Order': '@/modules/order/domain/entities/order.entity',
    'Product': '@/modules/product/domain/entities/product.entity',
    'Review': '@/modules/reviews/domain/entities/review.entity',
    'Wishlist': '@/modules/wishlist/domain/entities/wishlist.entity',
    'Notification': '@/modules/notification/domain/entities/notification.entity',
    'Cart': '@/modules/cart/domain/entities/cart.entity'
};

const moduleIndexPatterns = [
    { from: /@\/modules\/users/g, name: 'User' },
    { from: /@\/modules\/role/g, name: 'Role' },
    { from: /@\/modules\/client/g, name: 'ProfileClient' },
    { from: /@\/modules\/expert/g, name: 'ProfileExpert' },
    { from: /@\/modules\/coupon/g, name: 'UserCoupon' },
    { from: /@\/modules\/auth/g, name: 'OAuthAccount' }, // or Credential
    { from: /@\/modules\/chat/g, name: 'ChatSession' },
    { from: /@\/modules\/wallet/g, name: 'Wallet' },
    { from: /@\/modules\/order/g, name: 'Order' },
    { from: /@\/modules\/product/g, name: 'Product' },
    { from: /@\/modules\/reviews/g, name: 'Review' },
    { from: /@\/modules\/wishlist/g, name: 'Wishlist' },
    { from: /@\/modules\/notification/g, name: 'Notification' },
    { from: /@\/modules\/cart/g, name: 'Cart' }
];

function fixEntityImports(content, fullPath) {
    // Only apply to entity files to avoid breaking other things
    if (!fullPath.includes('domain' + path.sep + 'entities')) return content;

    let lines = content.split('\n');
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim().startsWith('import') && line.includes('from \'@/modules/')) {
            // Check if it's importing from a module index
            for (const pattern of moduleIndexPatterns) {
                if (pattern.from.test(line)) {
                    // It's a module index import.
                    // We need to parse which symbols are being imported and map them to direct paths.
                    // Example: import { User, Something } from '@/modules/users';
                    let match = line.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+'([^']+)'/);
                    if (match) {
                        let symbols = match[1].split(',').map(s => s.trim());
                        let fromPath = match[2];

                        // If the fromPath is EXACTLY a module index (no subpath)
                        if (fromPath.split('/').length <= 3) {
                            let newImports = [];
                            symbols.forEach(symbol => {
                                if (entityMap[symbol]) {
                                    newImports.push(`import { ${symbol} } from '${entityMap[symbol]}';`);
                                } else {
                                    // Keep original if not an entity we know?
                                    // Actually, in entities, it's safer to keep it or fix it manually.
                                    // For now, let's just log and skip if unknown.
                                    console.log(`Unknown symbol ${symbol} in ${fullPath}`);
                                    newImports.push(line);
                                }
                            });
                            lines[i] = newImports.join('\n');
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    return changed ? lines.join('\n') : content;
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = fixEntityImports(content, fullPath);

            if (newContent !== content) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Fixed entity imports in ${fullPath}`);
            }
        }
    });
}

walk(path.join(__dirname, '..', 'src', 'modules'));
