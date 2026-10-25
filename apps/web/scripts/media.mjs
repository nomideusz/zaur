// svelte-media demonstrating itself: one processAndStore call over a capture
// this page already shows, through the package's own local adapter, with its
// derive hook fitting a svelte-geometrize placeholder in the same pass. The
// files and their manifest are committed, like the captures (capture.py):
// re-run after a new capture or a new svelte-media.
//   node scripts/media.mjs
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { IMAGE_SIZES, createLocalAdapter, processAndStore } from '@nomideusz/svelte-media/server';
import { generatePlaceholder } from '@nomideusz/svelte-geometrize/node';

const root = new URL('../src/lib/media/', import.meta.url).pathname;
const source = new URL('../src/lib/windows/szkolyjogi.webp', import.meta.url).pathname;

await rm(root, { recursive: true, force: true });
const bytes = await readFile(source);
const file = new File([bytes], 'szkolyjogi.webp', { type: 'image/webp' });
const stored = await processAndStore(createLocalAdapter({ root }), file, 'captures', 'szkolyjogi', {
	derive: ({ buffer }) => generatePlaceholder(buffer)
});
if (!stored.derived) throw new Error('the derive hook failed');

const files = {};
for (const [size, key] of Object.entries(stored.sizes)) {
	const { width, height } = await sharp(root + key).metadata();
	files[size] = { key, width, height, bytes: (await stat(root + key)).size, fit: IMAGE_SIZES[size]?.fit ?? null };
}
const manifest = { source: { name: file.name, bytes: bytes.length }, files, derived: stored.derived };
await writeFile(root + 'manifest.json', JSON.stringify(manifest, null, '\t') + '\n');
console.log(Object.entries(files).map(([s, f]) => `${s} ${f.width}×${f.height} ${f.bytes} B ${f.key}`).join('\n'));
