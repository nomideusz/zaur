import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'css');
mkdirSync(outDir, { recursive: true });
const parts = [
  'theme.css',
  'circadian.css',
  'base.css',
  'label-input.css',
  'components.css',
  'auth.css',
  'site.css',
].map((file) => readFileSync(join(root, 'src', file), 'utf8'));

const css = parts.join('\n\n');

writeFileSync(join(root, 'css', 'zaur.css'), css);

const seedSrc = join(root, 'src/circadian/seed.js');
const seedTargets = [
  join(root, '../../apps/webmail/static/circadian-seed.js'),
  join(root, '../../apps/web/static/circadian-seed.js')
];
for (const target of seedTargets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(seedSrc, 'utf8'));
}
