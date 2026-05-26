const fs = require('fs');
const path = require('path');

function search(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            search(fullPath);
        } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js'))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('orders/verify') || content.includes('payment/orders/verify')) {
                console.log(`Found in: ${fullPath}`);
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (line.includes('orders/verify')) {
                        console.log(`${i+1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

search('d:/ravi/astrology-in-bharat-app-frontend');
