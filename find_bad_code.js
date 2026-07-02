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
            if (file.endsWith('.use-case.ts') || file.endsWith('usecase.ts')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const useCases = walk(rootDir);

let camelCaseIssues = [];
let multipleInjectIssues = [];

useCases.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const injectCount = (content.match(/@InjectRepository/g) || []).length;
    
    // Simplistic check for camelCase return object keys
    // Looks for lines matching:  camelCaseKey: 
    // And ensures it is part of a return block (heuristic)
    const lines = content.split('\n');
    let hasCamelCase = false;
    for (let line of lines) {
        if (line.match(/^\s+[a-z]+[A-Z][a-zA-Z0-9]*\s*:/) && !line.includes('//')) {
            hasCamelCase = true;
            break;
        }
    }
    
    if (hasCamelCase) {
        camelCaseIssues.push(file);
    }
    
    if (injectCount > 1) {
        multipleInjectIssues.push({ file, count: injectCount });
    }
});

console.log('=== USE CASES WITH CAMEL CASE KEYS ===');
camelCaseIssues.forEach(f => console.log(f.replace(rootDir, '')));

console.log('\n=== USE CASES WITH MULTIPLE INJECTS ===');
multipleInjectIssues.forEach(f => console.log(`${f.file.replace(rootDir, '')} (${f.count} injects)`));
