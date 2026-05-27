import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, 'dist');

await mkdir(distDir, { recursive: true });

await build({
  entryPoints: {
    'content-script': path.join(rootDir, 'src/content-script.ts'),
    background: path.join(rootDir, 'src/background.ts')
  },
  bundle: true,
  outdir: distDir,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: true,
  legalComments: 'none'
});

await copyFile(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
await copyFile(path.join(rootDir, 'logo.png'), path.join(distDir, 'logo.png'));
await copyFile(path.join(rootDir, 'notification-icon.png'), path.join(distDir, 'notification-icon.png'));