const fs = require('fs');
const path = require('path');

const rootDir = 'd:/ravi/astrology-in-bharat-services/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.includes('cart')) return;
        
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (file.endsWith('.use-case.ts') || file.endsWith('.usecase.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(rootDir);
const foundWords = new Set();

const camelCaseRegex = /\b([a-z]+[A-Z][a-zA-Z0-9]*)\s*:/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = camelCaseRegex.exec(content)) !== null) {
        // Skip some common typescript things like id:, url: which are not camelCase
        if (match[1] !== 'undefined' && match[1] !== 'return') {
            foundWords.add(match[1]);
        }
    }
});

console.log("Found potential camelCase keys:");
console.log(Array.from(foundWords).join(', '));
