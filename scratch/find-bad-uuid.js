const fs = require('fs');
const path = require('path');

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDir(fullPath);
        } else if (fullPath.endsWith('.entity.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes("type: 'uuid'") && content.includes("default: 0")) {
                console.log(`Found bad uuid default in: ${fullPath}`);
            }
        }
    }
}

searchDir('d:\\ravi\\astrology-in-bharat-services\\src');
