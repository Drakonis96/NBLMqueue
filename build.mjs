import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, 'dist');

await mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.join(rootDir, 'src/content-script.ts')],
  bundle: true,
  outfile: path.join(distDir, 'content-script.js'),
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: true,
  legalComments: 'none'
});

await copyFile(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
await copyFile(path.join(rootDir, 'logo.png'), path.join(distDir, 'logo.png'));