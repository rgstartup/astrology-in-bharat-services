const fs = require('fs');
const path = require('path');

function searchDir(dir, keyword) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDir(fullPath, keyword);
        } else if (fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(keyword)) {
                console.log(`Found in: ${fullPath}`);
            }
        }
    }
}

searchDir('d:\\ravi\\astrology-in-bharat-services\\src', 'total_likes');
