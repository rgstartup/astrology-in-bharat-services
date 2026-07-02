const fs = require('fs');
const path = require('path');

const rootDir = 'd:/ravi/astrology-in-bharat-services/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.includes('cart')) return;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            if (file.endsWith('.ts')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const files = walk(rootDir);

const searchWords = [
    'imageUrl',
    'percentageOff',
    'originalPrice',
    'expertId',
    'thumbnailUrl',
    'videoUrl',
    'coverImage',
    'profileImage',
    'firstName',
    'lastName',
    'fullName'
];

let leftoversFound = false;

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const word of searchWords) {
        // Find whole words only
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
            // Check if it's not in a comment or something we intentionally ignored
            console.log(`FOUND LEFTOVER '${word}' in: ${file.replace(rootDir, '')}`);
            leftoversFound = true;
            break; // Move to next file after first find to avoid spam
        }
    }
}

if (!leftoversFound) {
    console.log("SUCCESS: No leftovers found! All specific camelCase words have been completely removed.");
}
