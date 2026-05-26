const fs = require('fs');
const path = require('path');

const dir = 'd:/ravi/astrology-in-bharat-services/src/modules/commerce/wishlist/application/use-cases';
const files = fs.readdirSync(dir);

for (const file of files) {
  if (!file.endsWith('.ts')) continue;
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Fix where queries in find and findOne
  content = content.replace(/where:\s*\{\s*user:\s*\{\s*id:\s*userId\s*\}\s*,/g, "where: { client: { user: { id: userId } },");
  content = content.replace(/where:\s*\{\s*user:\s*\{\s*id:\s*userId\s*\}\s*\}/g, "where: { client: { user: { id: userId } } }");

  // Fix creation logic
  content = content.replace(/user,\s*expert:\s*expertUser/g, "client: await this.getClient(userId),\n      expert: await this.getExpert(finalExpertId)");
  content = content.replace(/user,\s*product/g, "client: await this.getClient(userId),\n      product: await this.getProduct(productId)");
  content = content.replace(/user,\s*merchant:\s*merchantUser/g, "client: await this.getClient(userId),\n      merchant: await this.getMerchant(finalMerchantId)");
  content = content.replace(/user,\s*puja/g, "client: await this.getClient(userId),\n      puja: await this.getPuja(pujaId)");

  fs.writeFileSync(path.join(dir, file), content);
}
