const fs = require('fs');
const path = require('path');

const rootDir = 'd:/ravi/astrology-in-bharat-services/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.includes('cart')) return; // Skip cart module
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            if (file.endsWith('.use-case.ts')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const useCases = walk(rootDir);

console.log('--- Use Cases returning camelCase (Potential Issues) ---');
useCases.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Check if it returns an object with camelCase keys like imageUrl, percentageOff etc.
    // A simple heuristic: look for `return { ... }` blocks with camelCase keys before a colon.
    const camelCaseRegex = /([a-z]+[A-Z][a-zA-Z0-9]*)\s*:/g;
    
    // Also check for multiple @InjectRepository
    const injectCount = (content.match(/@InjectRepository/g) || []).length;
    
    let hasCamelCaseReturn = false;
    // We can just flag files that have both a return statement and camelCase keys in object literals.
    if (content.includes('return') && content.match(camelCaseRegex)) {
        hasCamelCaseReturn = true;
    }
    
    if (hasCamelCaseReturn || injectCount > 1) {
        console.log(`\nFile: ${file.replace(rootDir, '')}`);
        if (hasCamelCaseReturn) console.log(`  - Potential camelCase keys found`);
        if (injectCount > 1) console.log(`  - Multiple Repositories Injected (${injectCount})`);
    }
});
