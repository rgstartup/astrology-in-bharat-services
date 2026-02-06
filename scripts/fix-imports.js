const fs = require('fs');
const path = require('path');

const patterns = [
    { from: /@\/common\/decorators\//g, to: '@/common/interfaces/decorators/' },
    { from: /@\/common\/interfaces\/user\.interface/g, to: '@/common/interfaces/shared/user.interface' },
    { from: /@\/modules\/expert\/bank-accounts\/entities\/bank-account\.entity/g, to: '@/modules/expert/domain/entities/bank-account.entity' },
    { from: /@\/common\/cloudinary\/cloudinary\.service/g, to: '@/common/infrastructure/storage/cloudinary/cloudinary.service' },
    { from: /from 'src\/core\//g, to: "from '@/core/" },
    { from: /from '\.\.\/src\/modules\/users'/g, to: "from '../src/modules/users/domain/entities/user.entity'" },
    { from: /from '\.\.\/src\/modules\/role\/entities\/roles\.entity'/g, to: "from '../src/modules/role/domain/entities/roles.entity'" },
    { from: /from '\.\.\/src\/modules\/client\/profile\/entities\/profile-client\.entity'/g, to: "from '../src/modules/client/domain/entities/profile-client.entity'" },
    { from: /from '\.\.\/src\/modules\/expert\/profile\/entities\/profile-expert\.entity'/g, to: "from '../src/modules/expert/domain/entities/profile-expert.entity'" },
    { from: /from '\.\.\/src\/common\/entities\/address\.entity'/g, to: "from '../src/common/domain/entities/address.entity'" },
    { from: /from '\.\.\/src\/modules\/auth\/entities\//g, to: "from '../src/modules/auth/domain/entities/" },
    { from: /from 'express'/g, to: "from 'express'" },
    { from: /import \* as request from 'supertest'/g, to: "import request from 'supertest'" }
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            patterns.forEach(pattern => {
                if (pattern.from.test(content)) {
                    content = content.replace(pattern.from, pattern.to);
                    changed = true;
                }
            });

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

walk(path.join(__dirname, '..', 'src'));
walk(path.join(__dirname, '..', 'test'));
walk(path.join(__dirname, '..', 'scripts'));
