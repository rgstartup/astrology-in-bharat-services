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
    'TransactionType': '@/modules/wallet/domain/entities/transaction.entity',
    'TransactionPurpose': '@/modules/wallet/domain/entities/transaction.entity',
    'Order': '@/modules/order/domain/entities/order.entity',
    'OrderItem': '@/modules/order/domain/entities/order-item.entity',
    'Product': '@/modules/product/domain/entities/product.entity',
    'Review': '@/modules/reviews/domain/entities/review.entity',
    'UserCoupon': '@/modules/coupon/domain/entities/user-coupon.entity',
    'Coupon': '@/modules/coupon/domain/entities/coupon.entity',
    'Notification': '@/modules/notification/domain/entities/notification.entity',
    'Cart': '@/modules/cart/domain/entities/cart.entity',
    'Credential': '@/modules/auth/domain/entities/credential.entity',
    'OAuthAccount': '@/modules/auth/domain/entities/oauth-accounts.entity',
    'UsedTokens': '@/modules/auth/domain/entities/used-tokens.entity',
    'Address': '@/common/domain/entities/address.entity',
    'AddressTag': '@/common/domain/entities/address.entity',
    'Withdrawal': '@/modules/wallet/domain/entities/withdrawal.entity',
    'WithdrawalStatus': '@/modules/wallet/domain/entities/withdrawal.entity',

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

    // Guards
    'JwtAuthGuard': '@/modules/auth/interfaces/guards/auth.guard',
    'RolesGuard': '@/modules/auth/interfaces/guards/role.guard',
};

// Module index paths that we want to avoid
const forbiddenPaths = [
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

function cleanFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let lines = content.split('\n');
    let newLines = [];
    let importBlockFinished = false;
    let symbolsByPath = {}; // path -> Set of symbols

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        if (trimmed.startsWith('import ')) {
            // Try to parse the import
            // This is a simplified parser for `import { A, B } from 'path';`
            // It might fail for multi-line imports, so we need to handle them.
            let fullImportLine = line;
            while (!fullImportLine.includes('from \'') && !fullImportLine.includes('from "') && i < lines.length - 1) {
                i++;
                fullImportLine += ' ' + lines[i].trim();
            }

            let match = fullImportLine.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/);
            if (match) {
                let symbols = match[1].split(',').map(s => s.trim()).filter(Boolean);
                let fromPath = match[2];

                symbols.forEach(symbol => {
                    let targetPath = fromPath;
                    if (replacementMap[symbol]) {
                        // If symbol is in our map, and the current path is forbidden OR it's a relative path to src (not modules)
                        if (forbiddenPaths.includes(fromPath) || fromPath.startsWith('../..')) {
                            targetPath = replacementMap[symbol];
                        }
                    }
                    if (!symbolsByPath[targetPath]) symbolsByPath[targetPath] = new Set();
                    symbolsByPath[targetPath].add(symbol);
                });
                continue;
            }

            // Handle default or namespace imports: `import * as X from 'path';` or `import X from 'path';`
            let nsMatch = fullImportLine.match(/import\s+(?:\*\s+as\s+)?([^\s{]+)\s+from\s+['"]([^'"]+)['"]/);
            if (nsMatch) {
                let symbol = nsMatch[1];
                let fromPath = nsMatch[2];
                if (!symbolsByPath[fromPath]) symbolsByPath[fromPath] = new Set();
                symbolsByPath[fromPath].add(`DEFAULT:${symbol}`); // Mark as default/namespace
                continue;
            }
        }

        if (trimmed === '' && !importBlockFinished) {
            // Keep empty lines in import block? Or just skip and re-generate.
            continue;
        }

        if (trimmed !== '' && !trimmed.startsWith('import') && !importBlockFinished) {
            // First non-import line signifies end of import block
            importBlockFinished = true;

            // Generate NEW import block
            let generatedImports = [];

            // Sort paths: @nestjs first, then other external, then @/core, then @/modules, then relative
            let paths = Object.keys(symbolsByPath).sort((a, b) => {
                const getScore = (p) => {
                    if (p.startsWith('@nestjs')) return 1;
                    if (!p.startsWith('@/') && !p.startsWith('.')) return 2;
                    if (p.startsWith('@/core')) return 3;
                    if (p.startsWith('@/common')) return 4;
                    if (p.startsWith('@/modules')) return 5;
                    return 6;
                };
                return getScore(a) - getScore(b) || a.localeCompare(b);
            });

            for (const p of paths) {
                let syms = Array.from(symbolsByPath[p]);
                let defaultSym = syms.find(s => s.startsWith('DEFAULT:'));
                let namedSyms = syms.filter(s => !s.startsWith('DEFAULT:'));

                if (defaultSym && namedSyms.length > 0) {
                    generatedImports.push(`import ${defaultSym.split(':')[1]}, { ${namedSyms.join(', ')} } from '${p}';`);
                } else if (defaultSym) {
                    if (p === 'supertest' && defaultSym.split(':')[1] === 'request') {
                        generatedImports.push(`import ${defaultSym.split(':')[1]} from '${p}';`);
                    } else if (p === 'passport-google-oauth20' || p === 'argon2' || p === 'dotenv' || p === 'express') {
                        generatedImports.push(`import * as ${defaultSym.split(':')[1]} from '${p}';`);
                    } else {
                        generatedImports.push(`import ${defaultSym.split(':')[1]} from '${p}';`);
                    }
                } else if (namedSyms.length > 0) {
                    generatedImports.push(`import { ${namedSyms.join(', ')} } from '${p}';`);
                }
            }

            newLines.push(...generatedImports);
            newLines.push(''); // spacing after imports
        }

        if (importBlockFinished) {
            newLines.push(line);
        }
    }

    let result = newLines.join('\n');
    if (result !== content) {
        fs.writeFileSync(fullPath, result);
        console.log(`Rewrote imports in ${fullPath}`);
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
            try {
                cleanFile(fullPath);
            } catch (e) {
                console.error(`Failed to clean ${fullPath}: ${e.message}`);
            }
        }
    });
}

walk(path.join(__dirname, '..', 'src'));
walk(path.join(__dirname, '..', 'test'));
walk(path.join(__dirname, '..', 'scripts'));
