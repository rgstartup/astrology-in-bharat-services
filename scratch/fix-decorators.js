const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const entityFiles = [];
walkDir('./src', (filePath) => {
  if (filePath.endsWith('.entity.ts')) {
    entityFiles.push(filePath);
  }
});

entityFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix the @() issue
  content = content.replace(/@\(\)/g, '@PrimaryKeyColumn()');
  
  // Wait, what about @PrimaryGeneratedColumn('uuid') ? It would have become @('uuid').
  content = content.replace(/@\('uuid'\)/g, "@PrimaryKeyColumn()");

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});
console.log('Fix complete.');
