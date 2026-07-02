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
            if (file.endsWith('.ts')) { // Search ALL TS files to be safe
                results.push(fullPath);
            }
        }
    });
    return results;
}

const files = walk(rootDir);

const replacements = {
    'imageUrl:': 'image_url:',
    'imageUrl?': 'image_url?',
    'percentageOff:': 'percentage_off:',
    'percentageOff?': 'percentage_off?',
    'originalPrice:': 'original_price:',
    'originalPrice?': 'original_price?',
    'expertId:': 'expert_id:',
    'expertId?': 'expert_id?',
    'thumbnailUrl:': 'thumbnail_url:',
    'thumbnailUrl?': 'thumbnail_url?',
    'videoUrl:': 'video_url:',
    'videoUrl?': 'video_url?',
    'coverImage:': 'cover_image:',
    'coverImage?': 'cover_image?',
    'profileImage:': 'profile_image:',
    'profileImage?': 'profile_image?',
    'firstName:': 'first_name:',
    'firstName?': 'first_name?',
    'lastName:': 'last_name:',
    'lastName?': 'last_name?',
    'fullName:': 'full_name:',
    'fullName?': 'full_name?'
};

let totalModified = 0;

for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf8');
    let newContent = originalContent;
    let modified = false;

    for (const [camel, snake] of Object.entries(replacements)) {
        // Simple string replace for common exact phrases
        // It's safer to use split/join for global replacement of exact strings
        if (newContent.includes(camel)) {
            newContent = newContent.split(camel).join(snake);
            modified = true;
        }
        
        // Also handle cases with spaces: imageUrl :
        const withSpace = camel.replace(':', ' :').replace('?', ' ?');
        if (newContent.includes(withSpace)) {
            newContent = newContent.split(withSpace).join(snake.replace(':', ' :').replace('?', ' ?'));
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated: ${file.replace(rootDir, '')}`);
        totalModified++;
    }
}

console.log(`\nFixed camelCase in ${totalModified} files.`);
