const fs = require('fs');
const path = require('path');

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Fix +id conversions
            content = content.replace(/\+expertId/g, 'expertId');
            content = content.replace(/\+productId/g, 'productId');
            content = content.replace(/\+pujaId/g, 'pujaId');
            content = content.replace(/\+merchantId/g, 'merchantId');
            content = content.replace(/\+id/g, 'id');

            // Fix number types
            content = content.replace(/userId: number/g, 'userId: string');
            content = content.replace(/productId: number/g, 'productId: string');
            content = content.replace(/expertId: number/g, 'expertId: string');
            content = content.replace(/pujaId: number/g, 'pujaId: string');
            content = content.replace(/merchantId: number/g, 'merchantId: string');
            
            // Fix cart.controller.ts specific bugs
            content = content.replace(/client\.id/g, 'user.id');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory(path.join(__dirname, '../src/modules/commerce'));
processDirectory(path.join(__dirname, '../src/modules/cart')); // if exists
