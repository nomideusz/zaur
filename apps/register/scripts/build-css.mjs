// Builds public/app.css from src/app.css (mail2's tokens + base, plus register's
// own bits) and copies mail2's Ioskeley Mono and icons next to it. The Docker image has no
// build step, so both outputs are committed: run this after touching any of
// the inputs, or mail2's styles.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonts = join(root, '../mail2/src/routes/styles/fonts');
const out = join(root, 'public/app.css');

execFileSync(join(root, 'node_modules/.bin/tailwindcss'), ['-i', 'src/app.css', '-o', out, '--minify'], {
  cwd: root,
  stdio: 'inherit',
});

// tokens.css points at ./fonts/ beside itself; here they are served from /fonts/.
writeFileSync(out, readFileSync(out, 'utf8').replace(/url\([^)]*?(IoskeleyMono-[\w-]+\.woff2)\)/g, 'url(/fonts/$1)'));

mkdirSync(join(root, 'public/fonts'), { recursive: true });
for (const file of ['IoskeleyMono-Regular.woff2', 'IoskeleyMono-Medium.woff2', 'IoskeleyMono-SemiBold.woff2', 'OFL.txt']) {
  copyFileSync(join(fonts, file), join(root, 'public/fonts', file));
}
// The ZA/UR mark, as mail2 serves it.
for (const file of ['favicon.svg', 'favicon.png', 'apple-touch-icon.png']) {
  copyFileSync(join(root, '../mail2/static', file), join(root, 'public', file));
}
