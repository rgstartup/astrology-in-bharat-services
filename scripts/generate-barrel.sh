#!/usr/bin/env bash

# Exit on error
set -e

# Help message
if [ "$1" = "-h" ] || [ "$1" = "--help" ] || [ -z "$1" ]; then
  echo "Usage: $0 <directory-path> [--recursive|-r]"
  echo "Example: $0 src/internal/users/use-cases"
  exit 1
fi

TARGET_DIR="$1"
RECURSIVE=false

if [ "$2" = "-r" ] || [ "$2" = "--recursive" ]; then
  RECURSIVE=true
fi

# Run Node script to parse TypeScript AST and generate exact named exports
node -e '
const fs = require("fs");
const path = require("path");

let ts;
try {
  ts = require("typescript");
} catch (e) {
  ts = null;
}

const targetInput = process.argv[1];
const isRecursive = process.argv[2] === "true";

// Normalize target path
const resolvedTarget = path.resolve(process.cwd(), targetInput);

if (!fs.existsSync(resolvedTarget)) {
  console.error(`Error: Directory not found: ${resolvedTarget}`);
  process.exit(1);
}

const stat = fs.statSync(resolvedTarget);
if (!stat.isDirectory()) {
  console.error(`Error: Target is not a directory: ${resolvedTarget}`);
  process.exit(1);
}

function getDirectories(dir) {
  const dirs = [dir];
  if (!isRecursive) return dirs;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      dirs.push(...getDirectories(path.join(dir, entry.name)));
    }
  }
  return dirs;
}

function parseWithTS(filePath, content) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const valueExports = new Set();
  const typeExports = new Set();

  function visit(node) {
    // 1. Export declarations: export { A, type B, C as D } [from "..."]
    if (ts.isExportDeclaration(node)) {
      const isTypeOnlyClause = node.isTypeOnly;
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const exportName = element.name.text;
          if (isTypeOnlyClause || element.isTypeOnly) {
            typeExports.add(exportName);
          } else {
            valueExports.add(exportName);
          }
        }
      }
    }

    // 2. Modifiers on statements: export const/class/function/enum/interface/type
    const modifiers = ts.getModifiers(node);
    const hasExport = modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    const isDefault = modifiers && modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

    if (hasExport) {
      if (isDefault) {
        if (node.name && node.name.text) {
          valueExports.add(`default as ${node.name.text}`);
        }
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            valueExports.add(decl.name.text);
          }
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        valueExports.add(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        valueExports.add(node.name.text);
      } else if (ts.isEnumDeclaration(node) && node.name) {
        valueExports.add(node.name.text);
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        typeExports.add(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        typeExports.add(node.name.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    values: Array.from(valueExports).sort(),
    types: Array.from(typeExports).filter(t => !valueExports.has(t)).sort()
  };
}

function parseWithRegex(content) {
  const valueExports = new Set();
  const typeExports = new Set();

  // export class / function / enum / const / let / var
  const valRegex = /export\s+(?:declare\s+)?(?:class|function\*?|enum|const|let|var)\s+([a-zA-Z0-9_$]+)/g;
  let match;
  while ((match = valRegex.exec(content)) !== null) {
    valueExports.add(match[1]);
  }

  // export interface / type
  const typeRegex = /export\s+(?:declare\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/g;
  while ((match = typeRegex.exec(content)) !== null) {
    typeExports.add(match[1]);
  }

  // export { ... }
  const namedExportRegex = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const isTypeGroup = match[0].includes("export type");
    const items = match[1].split(",");
    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const isItemType = trimmed.startsWith("type ");
      const rawName = trimmed.replace(/^type\s+/, "");
      const finalName = rawName.includes(" as ") ? rawName.split(" as ")[1].trim() : rawName.trim();
      if (isTypeGroup || isItemType) {
        typeExports.add(finalName);
      } else {
        valueExports.add(finalName);
      }
    }
  }

  return {
    values: Array.from(valueExports).sort(),
    types: Array.from(typeExports).filter(t => !valueExports.has(t)).sort()
  };
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const barrelLines = [];

  const files = entries
    .filter(e => e.isFile() && /\.(ts|tsx|js|jsx)$/.test(e.name))
    .map(e => e.name)
    .filter(name => !/^index\.(ts|tsx|js|jsx)$/.test(name) && !/\.(spec|test|d)\.(ts|tsx|js|jsx)$/.test(name))
    .sort();

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const parsed = ts ? parseWithTS(fullPath, content) : parseWithRegex(content);

    const exportItems = [];
    for (const val of parsed.values) {
      exportItems.push(val);
    }
    for (const type of parsed.types) {
      exportItems.push(`type ${type}`);
    }

    if (exportItems.length > 0) {
      const importPath = `./${file.replace(/\.(ts|tsx|js|jsx)$/, "")}`;
      if (exportItems.length > 3) {
        const itemsFormatted = exportItems.map(i => `  ${i},`).join("\n");
        barrelLines.push(`export {\n${itemsFormatted}\n} from '\''${importPath}'\'';`);
      } else {
        barrelLines.push(`export { ${exportItems.join(", ")} } from '\''${importPath}'\'';`);
      }
    }
  }

  const barrelPath = path.join(dirPath, "index.ts");
  if (barrelLines.length === 0) {
    console.log(`[Skip] No exported symbols in ${path.relative(process.cwd(), dirPath)}`);
    return;
  }

  const outputContent = barrelLines.join("\n") + "\n";
  fs.writeFileSync(barrelPath, outputContent, "utf-8");
  console.log(`[Created/Updated] ${path.relative(process.cwd(), barrelPath)} (${barrelLines.length} files exported)`);
}

const targetDirs = getDirectories(resolvedTarget);
for (const d of targetDirs) {
  processDirectory(d);
}
' "$TARGET_DIR" "$RECURSIVE"
