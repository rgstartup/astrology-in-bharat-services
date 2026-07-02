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

// Replace any occurrence of the camelCase word with snake_case.
const map = {
    'imageUrl': 'image_url',
    'percentageOff': 'percentage_off',
    'originalPrice': 'original_price',
    'expertId': 'expert_id',
    'thumbnailUrl': 'thumbnail_url',
    'videoUrl': 'video_url',
    'coverImage': 'cover_image',
    'profileImage': 'profile_image'
};

for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf8');
    let newContent = originalContent;
    let modified = false;

    for (const [camel, snake] of Object.entries(map)) {
        // Use a global regex to replace all words exactly matching camel
        const regex = new RegExp(`\\b${camel}\\b`, 'g');
        if (newContent.match(regex)) {
            newContent = newContent.replace(regex, snake);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated: ${file.replace(rootDir, '')}`);
    }
}
