const fs = require('fs');

const fixWalletUseCase = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Wallet queries
  content = content.replace(/where:\s*{\s*user_id:\s*userId\s*}/g, "where: { client_id: userId } /* TODO: Fix profile lookup */");
  content = content.replace(/where:\s*{\s*id:\s*userId\s*}/g, "where: { id: userId }");

  // Profile lookups where user_id is missing
  content = content.replace(/user:\s*{\s*id:\s*userId\s*}/g, "user_id: userId");
  
  // Withdrawal queries
  content = content.replace(/where:\s*{\s*user_id:\s*withdrawal\.user_id\s*}/g, "where: { expert_id: withdrawal.expert_id } /* TODO: Check */");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

const files = [
  'src/modules/wallet/application/use-cases/request-withdrawal.use-case.ts',
  'src/modules/wallet/application/use-cases/update-withdrawal-status.use-case.ts',
  'src/modules/wallet/application/use-cases/credit.use-case.ts',
  'src/modules/wallet/application/use-cases/debit.use-case.ts',
  'src/modules/wallet/application/use-cases/deduct-from-reserved.use-case.ts',
  'src/modules/wallet/application/use-cases/get-wallet.use-case.ts',
];

files.forEach(fixWalletUseCase);
