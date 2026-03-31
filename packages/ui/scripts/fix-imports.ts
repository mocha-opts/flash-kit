import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');

const REPLACEMENTS: [RegExp, string][] = [
  [/from ["']@\/lib\/utils["']/g, 'from "../lib/utils"'],
  [/from ["']@\/components\/(.+?)["']/g, 'from "./$1"'],
  [/from ["']@\/hooks\/(.+?)["']/g, 'from "../hooks/$1"'],
];

async function fixImports() {
  let fixedCount = 0;

  const files = await readdir(COMPONENTS_DIR);
  const tsxFiles = files.filter((f) => f.endsWith('.tsx'));

  for (const file of tsxFiles) {
    const filePath = join(COMPONENTS_DIR, file);
    const original = await readFile(filePath, 'utf-8');
    let content = original;

    for (const [pattern, replacement] of REPLACEMENTS) {
      content = content.replace(pattern, replacement);
    }

    if (content !== original) {
      await writeFile(filePath, content, 'utf-8');
      fixedCount++;
      console.log(`  Fixed: ${file}`);
    }
  }

  console.log(`\nDone. Fixed ${fixedCount} file(s).`);
}

fixImports().catch(console.error);
