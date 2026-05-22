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

  // 1. Replace @PrimaryGeneratedColumn with @PrimaryKeyColumn
  if (content.includes('@PrimaryGeneratedColumn')) {
    // Add import if not present
    if (!content.includes('PrimaryKeyColumn')) {
      // Find the last import statement
      const lastImportMatch = [...content.matchAll(/import.*from.*;/g)].pop();
      if (lastImportMatch) {
        const insertPos = lastImportMatch.index + lastImportMatch[0].length;
        content = content.slice(0, insertPos) + "\nimport { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';" + content.slice(insertPos);
      } else {
        content = "import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';\n" + content;
      }
    }

    // Remove PrimaryGeneratedColumn from typeorm import
    content = content.replace(/PrimaryGeneratedColumn,?\s*/g, '');
    
    // Replace the decorator
    content = content.replace(/@PrimaryGeneratedColumn\(\)/g, '@PrimaryKeyColumn()');
    content = content.replace(/@PrimaryGeneratedColumn\([^)]+\)/g, '@PrimaryKeyColumn()');
    
    // Replace id!: number to id!: string
    content = content.replace(/id!: number;/g, 'id!: string;');
    content = content.replace(/id: number;/g, 'id: string;');
  }

  // 2. Replace all FK types from int to uuid, and number to string
  // For anything ending in _id or Id that is a number
  content = content.replace(/type:\s*'int'/g, "type: 'uuid'");
  content = content.replace(/type:\s*"int"/g, "type: 'uuid'");
  
  // Replace `user_id!: number;` with `user_id!: string;` etc.
  content = content.replace(/(_id!:?) number/g, '$1 string');
  content = content.replace(/(_id\?:?) number/g, '$1 string');
  
  // Specifically target known ones
  content = content.replace(/user_id!: number/g, 'user_id!: string');
  content = content.replace(/client_id!: number/g, 'client_id!: string');
  content = content.replace(/expert_id!: number/g, 'expert_id!: string');
  content = content.replace(/merchant_id!: number/g, 'merchant_id!: string');
  content = content.replace(/agent_id!: number/g, 'agent_id!: string');
  content = content.replace(/puja_id!: number/g, 'puja_id!: string');
  content = content.replace(/order_id!: number/g, 'order_id!: string');
  content = content.replace(/session_id!: number/g, 'session_id!: string');
  content = content.replace(/coupon_id!: number/g, 'coupon_id!: string');
  content = content.replace(/dispute_id!: number/g, 'dispute_id!: string');
  content = content.replace(/sender_id!: number/g, 'sender_id!: string');
  content = content.replace(/consultation_id!: number/g, 'consultation_id!: string');
  content = content.replace(/bank_account_id!: number/g, 'bank_account_id!: string');
  content = content.replace(/call_session_id!: number/g, 'call_session_id!: string');
  content = content.replace(/item_id\?: number/g, 'item_id?: string');
  content = content.replace(/agent_profile_id!: number/g, 'agent_profile_id!: string');
  content = content.replace(/admin_id!: number/g, 'admin_id!: string');
  
  // Nullable ones
  content = content.replace(/(_id!:? number \| null)/g, (match, p1) => p1.replace('number', 'string'));
  content = content.replace(/(_id\?:? number \| null)/g, (match, p1) => p1.replace('number', 'string'));

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
console.log('Entity refactoring complete.');
