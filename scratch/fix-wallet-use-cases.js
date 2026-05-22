const fs = require('fs');

const filesToFix = [
  'src/modules/wallet/application/use-cases/credit.use-case.ts',
  'src/modules/wallet/application/use-cases/debit.use-case.ts',
  'src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts',
  'src/modules/wallet/application/use-cases/release-reserved.use-case.ts',
];

const walletLookupCode = `
      // --- START WALLET LOOKUP ---
      const { ProfileClient } = await import('../../../client/profile/infrastructure/entities/profile-client.entity');
      const { ProfileExpert } = await import('../../../expert/profile/infrastructure/entities/profile-expert.entity');
      const { ProfileMerchant } = await import('../../../merchant/profile/infrastructure/entities/profile-merchant.entity');
      const { ProfileAgent } = await import('../../../agent/infrastructure/entities/profile-agent.entity');

      let walletOwnerId = '';
      let queryKey = '';

      const expert = await qr.manager.findOne(ProfileExpert, { where: { user: { id: userId } } });
      if (expert) { walletOwnerId = expert.id; queryKey = 'expert_id'; }
      
      if (!walletOwnerId) {
         const merchant = await qr.manager.findOne(ProfileMerchant, { where: { user: { id: userId } } });
         if (merchant) { walletOwnerId = merchant.id; queryKey = 'merchant_id'; }
      }

      if (!walletOwnerId) {
         const agent = await qr.manager.findOne(ProfileAgent, { where: { user: { id: userId } } });
         if (agent) { walletOwnerId = agent.id; queryKey = 'agent_id'; }
      }

      if (!walletOwnerId) {
         const client = await qr.manager.findOne(ProfileClient, { where: { user: { id: userId } } });
         if (client) { walletOwnerId = client.id; queryKey = 'client_id'; }
      }
      
      let wallet = await qr.manager.findOne(Wallet, {
        where: { [queryKey || 'client_id']: walletOwnerId },
        lock: { mode: 'pessimistic_write' },
      });
      // --- END WALLET LOOKUP ---
`;

const walletSaveCode = `
      if (!wallet && walletOwnerId && queryKey) {
        wallet = qr.manager.create(Wallet, {
          [queryKey]: walletOwnerId,
          balance: 0,
          reserved_balance: 0,
        });
        wallet = await qr.manager.save(Wallet, wallet);
      }
`;

for (const file of filesToFix) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix signature
  content = content.replace(/userId:\s*number/g, 'userId: string');

  // Replace Wallet fetch
  const fetchPattern = /let\s+wallet\s*=\s*await\s+qr\.manager\.findOne\(Wallet,\s*{\s*where:\s*{\s*user_id:\s*(Number\(userId\)|userId)\s*},\s*lock:\s*{\s*mode:\s*'pessimistic_write'\s*},?\s*}\);/g;
  content = content.replace(fetchPattern, walletLookupCode);

  // Replace Wallet create
  const createPattern = /if\s*\(!wallet\)\s*{\s*wallet\s*=\s*qr\.manager\.create\(Wallet,\s*{\s*user_id:\s*(Number\(userId\)|userId),\s*balance:\s*0,\s*reserved_balance:\s*0,?\s*}\);\s*wallet\s*=\s*await\s+qr\.manager\.save\(Wallet,\s*wallet\);\s*}/g;
  content = content.replace(createPattern, walletSaveCode);

  // Replace query builder update
  content = content.replace(/\.where\('user_id = :userId',\s*{\s*userId\s*}\)/g, `.where(\`\${queryKey || 'client_id'} = :walletOwnerId\`, { walletOwnerId })`);

  // Replace final fetch
  content = content.replace(/const\s+refreshedWallet\s*=\s*await\s+qr\.manager\.findOne\(Wallet,\s*{\s*where:\s*{\s*user_id:\s*userId\s*}\s*}\);/g, `const refreshedWallet = await qr.manager.findOne(Wallet, { where: { [queryKey || 'client_id']: walletOwnerId } });`);
  
  // Also for non-qr.manager if any
  content = content.replace(/where:\s*{\s*user_id:\s*userId\s*}/g, `where: { [queryKey || 'client_id']: walletOwnerId }`);

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
