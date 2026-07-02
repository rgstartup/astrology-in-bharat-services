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
let totalModified = 0;

controllers.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // This regex matches "return { success: true, data: someVar };" 
  // We want to replace it with "return { success: true };"
  // But ONLY for methods decorated with @Put, @Patch, @Delete.
  // Since we can't easily parse AST here without dependencies, 
  // we will use a regex that matches the method body if it has the decorator before it.
  
  // A safer string replacement:
  // We can just replace `return { success: true, data: ... }` with `return { success: true }` globally in these files
  // assuming that ANY controller method returning data for PUT/PATCH/DELETE shouldn't,
  // and even for POST maybe? Wait, Sushant sir said "Koi bhi update ya delete operation". POST is create, GET is read.
  // If we blindly replace all `data: ...` in the file, we might affect GET and POST methods in the same controller!
  // So we MUST ONLY replace inside PUT/PATCH/DELETE.
  
  // Let's use a simple state machine to parse the file line by line.
  const lines = content.split('\n');
  let inUpdateDeleteMethod = false;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we are entering a Put, Patch, or Delete method
    if (/@(Put|Patch|Delete)\b/.test(line)) {
      inUpdateDeleteMethod = true;
    }
    
    // Check if we are entering a Get or Post method
    if (/@(Get|Post)\b/.test(line)) {
      inUpdateDeleteMethod = false;
    }
    
    if (inUpdateDeleteMethod) {
      // If we see a return statement with success: true and data: ...
      // Let's replace it.
      if (/return\s*\{\s*success\s*:\s*true\s*,\s*data\s*:\s*[^}]+\s*\}/.test(line)) {
        lines[i] = line.replace(/,\s*data\s*:\s*[^}\s]+(\s*)/, '$1');
      }
    }
  }
  
  const newContent = lines.join('\n');
  
  if (newContent !== originalContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Modified: ${file}`);
    totalModified++;
  }
});

console.log(`Total controllers modified: ${totalModified}`);
