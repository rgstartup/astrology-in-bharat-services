const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.entity.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Regex to find @Column({... type: 'uuid' ... default: 0 ...})
            // and replace type: 'uuid' with type: 'int'
            const regex = /@Column\(\s*\{([^}]*)type:\s*['"]uuid['"]([^}]*)default:\s*0([^}]*)\}\s*\)/g;
            
            let changed = false;
            content = content.replace(regex, (match, p1, p2, p3) => {
                changed = true;
                return `@Column({${p1}type: 'int'${p2}default: 0${p3}})`;
            });
            
            // What if default: 0 comes before type: 'uuid'?
            const regex2 = /@Column\(\s*\{([^}]*)default:\s*0([^}]*)type:\s*['"]uuid['"]([^}]*)\}\s*\)/g;
            content = content.replace(regex2, (match, p1, p2, p3) => {
                changed = true;
                return `@Column({${p1}default: 0${p2}type: 'int'${p3}})`;
            });

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`Fixed bad uuid default in: ${fullPath}`);
            }
        }
    }
}

processDir('d:\\ravi\\astrology-in-bharat-services\\src');
