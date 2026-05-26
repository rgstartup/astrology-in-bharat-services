const fs = require('fs');
const path = require('path');

const dir = 'd:/ravi/astrology-in-bharat-services/src/modules/commerce/wishlist/application/use-cases';

const files = fs.readdirSync(dir);

for (const file of files) {
  if (!file.endsWith('.ts')) continue;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix GET use cases
  if (file.startsWith('get-')) {
    content = content.replace(
      /where: \{ user: \{ id: userId \} \}/g,
      "where: { client: { user: { id: userId } } }"
    );
  }

  // Fix REMOVE use cases
  if (file.startsWith('remove-')) {
    content = content.replace(
      /where: \{ user: \{ id: userId \}/g,
      "where: { client: { user: { id: userId } }"
    );
  }

  // Write changes
  fs.writeFileSync(filePath, content);
  console.log(`Updated GET/REMOVE in ${file}`);
}
