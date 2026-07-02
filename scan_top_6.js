const fs = require('fs');
const path = require('path');

const rootDir = 'd:/ravi/astrology-in-bharat-services/src/modules';
const targetFolders = ['admin', 'agent', 'astrology', 'auth', 'calendar', 'client'];

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (file.endsWith('.use-case.ts') || file.endsWith('.usecase.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

let allUseCases = [];
targetFolders.forEach(folder => {
    allUseCases = allUseCases.concat(walk(path.join(rootDir, folder)));
});

console.log(`Scanning top 6 modules (${targetFolders.join(', ')}) for issues...\n`);

let issuesFound = false;

allUseCases.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check Rule 2: Multiple Repository Injections
    const injectCount = (content.match(/@InjectRepository/g) || []).length;
    
    // Check Rule 3: Manual transactions (e.g. using QueryRunner instead of utility)
    const manualTransaction = content.includes('queryRunner.startTransaction') || content.includes('queryRunner.commitTransaction');
    
    if (injectCount > 1 || manualTransaction) {
        issuesFound = true;
        const relativePath = file.replace('d:/ravi/astrology-in-bharat-services/src/modules/', '');
        console.log(`\n📄 File: ${relativePath}`);
        if (injectCount > 1) {
            console.log(`   🚨 Issue: Multiple Repositories Injected (${injectCount} repos). Should call other Use-Cases instead.`);
        }
        if (manualTransaction) {
            console.log(`   🚨 Issue: Manual Transaction logic found. Should use the Transaction Utility.`);
        }
    }
});

if (!issuesFound) {
    console.log("No issues found in these 6 modules! They are clean.");
}
