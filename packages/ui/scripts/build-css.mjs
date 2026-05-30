import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'css');
mkdirSync(outDir, { recursive: true });
const parts = ['theme.css', 'base.css', 'components.css', 'site.css'].map((file) =>
  readFileSync(join(root, 'src', file), 'utf8')
);

const css = parts.join('\n\n');

writeFileSync(join(root, 'css', 'zaur.css'), css);

const registerCss = join(root, '../../apps/register/public/zaur.css');
mkdirSync(dirname(registerCss), { recursive: true });
writeFileSync(registerCss, css);
