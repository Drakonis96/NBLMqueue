import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  host_permissions?: string[];
  content_scripts?: Array<{
    matches?: string[];
  }>;
}

const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), 'manifest.json'), 'utf8')
) as ExtensionManifest;

describe('extension manifest', () => {
  it('runs on both NotebookLM domains', () => {
    const notebookLmOrigins = [
      'https://notebooklm.google.com/*',
      'https://notebook.google.com/*'
    ];

    expect(manifest.host_permissions).toEqual(expect.arrayContaining(notebookLmOrigins));
    expect(manifest.content_scripts?.[0]?.matches).toEqual(
      expect.arrayContaining(notebookLmOrigins)
    );
  });
});
