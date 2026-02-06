const fs = require('fs');
const path = require('path');

function repairFile(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let lines = content.split('\n');
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Match a line that looks like an orphan import part:
        // "  SymbolName," or "SymbolName," or "SymbolName } from '...'"
        // and doesn't have "import {"
        if (!line.includes('import ') && (line.includes('} from \'') || line.includes('} from "'))) {
            // This is the END of an import block.
            // Let's look BACKWARDS to find where it should have started.
            let j = i;
            let symbols = [];
            while (j >= 0) {
                let prevLine = lines[j];
                if (prevLine.includes('import ')) {
                    // Found a valid import, so this orphan might be after it.
                    break;
                }
                if (prevLine.trim() === '' || prevLine.includes('@Injectable') || prevLine.includes('export ')) {
                    // Hit something else
                    break;
                }
                j--;
            }

            // If we didn't find "import {" in the block j+1 ... i
            let hasImport = false;
            for (let k = j + 1; k <= i; k++) {
                if (lines[k].includes('import {')) {
                    hasImport = true;
                    break;
                }
            }

            if (!hasImport) {
                // Fix it!
                lines[j + 1] = 'import { ' + lines[j + 1].trim();
                changed = true;
                console.log(`Repaired orphan import in ${fullPath} at line ${j + 2}`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(fullPath, lines.join('\n'));
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            repairFile(fullPath);
        }
    });
}

walk(path.join(__dirname, '..', 'src'));
walk(path.join(__dirname, '..', 'scripts'));
walk(path.join(__dirname, '..', 'test'));
