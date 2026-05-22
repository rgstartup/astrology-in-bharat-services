const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/modules/wallet/**/*.ts");

for (const sourceFile of sourceFiles) {
  let changed = false;

  // Find all property access expressions like `.user_id` on Wallet/Withdrawal and change based on context
  sourceFile.forEachDescendant(node => {
    // Replace !isNaN(bank_account_id) with bank_account_id (since it's a UUID string now)
    if (node.getKind() === SyntaxKind.CallExpression) {
       const text = node.getText();
       if (text.startsWith('isNaN(') && text.includes('bank_account_id')) {
           node.replaceWithText("false"); // So !false is true
           changed = true;
       }
    }

    // Remove Number() or parseInt() wrappers
    if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        if (text.startsWith('Number(') || text.startsWith('parseInt(')) {
            const args = node.getArguments();
            if (args.length > 0 && args[0].getType().isString()) {
                node.replaceWithText(args[0].getText());
                changed = true;
            }
        }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`AST fixed: ${sourceFile.getFilePath()}`);
  }
}
console.log('Morph fix complete.');
