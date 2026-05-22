const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const tsFiles = [];
walkDir('./src', (filePath) => {
  if (filePath.endsWith('.ts') && !filePath.endsWith('.entity.ts')) {
    tsFiles.push(filePath);
  }
});

tsFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Controller Pipes
  content = content.replace(/ParseIntPipe/g, 'ParseUUIDPipe');

  // 2. Class Validator
  // Replace @IsInt() with @IsUUID() for id properties
  content = content.replace(/@IsInt\(\)\s*([a-zA-Z0-9_]*id\b)/g, '@IsUUID()\n  $1');
  content = content.replace(/@IsInt\(\)\s*([a-zA-Z0-9_]*Id\b)/g, '@IsUUID()\n  $1');

  // 3. TypeORM where closures
  // Number(id) -> id
  content = content.replace(/Number\(([a-zA-Z0-9_]*id)\)/g, '$1');
  content = content.replace(/parseInt\(([a-zA-Z0-9_]*id)\)/g, '$1');
  
  // 4. Module specific replacements for `user_id`
  if (file.includes('commerce') || file.includes('payment') || file.includes('reviews')) {
    content = content.replace(/user_id/g, 'client_id');
    content = content.replace(/user\.id/g, 'client.id');
    content = content.replace(/user\?/g, 'client?');
  }

  // 5. General ID types
  // DTOs and Interfaces often declare user_id: number;
  content = content.replace(/([a-zA-Z0-9_]*id)\s*:\s*number/g, '$1: string');
  
  // 6. Fix `generateTransactionNo` logic using number
  // It expects number, we pass string. We'll truncate it.
  content = content.replace(/generateTransactionNo\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "generateTransactionNo($1, $2, $3)");
  // Actually, we'll fix generateTransactionNo definition
  if (file.includes('generate-transaction-no')) {
     content = content.replace(/id:\s*number/g, 'id: string');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});
console.log('Auto-fix script completed.');
