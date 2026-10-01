import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function prepareVercelStatic(outputDir = join(repoRoot, 'public')) {
  const target = resolve(outputDir);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name === 'index.html' || entry.name.endsWith('.css')) {
      cpSync(join(repoRoot, entry.name), join(target, entry.name));
    }
  }

  cpSync(join(repoRoot, 'src'), join(target, 'src'), { recursive: true });
  return target;
}

if (process.argv[1] && basename(process.argv[1]) === 'prepare-vercel-static.mjs') {
  prepareVercelStatic(process.argv[2]);
}
