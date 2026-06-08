const fs = require('fs');
const path = require('path');

const srcDir = 'd:/ravi/astrology-in-bharat-services/src';

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, files);
    } else if (filePath.endsWith('.controller.ts')) {
      files.push(filePath);
    }
  }
  return files;
}

const controllers = findFiles(srcDir);
let totalChanged = 0;

controllers.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // This is a rough regex to find methods with @Put, @Patch, @Delete and change their return statements.
  // A better approach is to match the decorator and then the method body.
  // Let's just log how many controllers have these decorators first.
  if (/@(Put|Patch|Delete)\b/.test(content)) {
    console.log(`Found in: ${file}`);
    totalChanged++;
  }
});

console.log(`Total controllers to modify: ${totalChanged}`);
