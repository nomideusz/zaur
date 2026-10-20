// Which of my packages each product is built from, read at prerender from the
// products' own code. Each repo is downloaded once as a tarball and streamed:
// only source files inside the product's folders are kept, and their
// `@nomideusz/*` imports are the answer. Imports, not package.json: the asini
// apps import svelte-i18n through the workspace without declaring it.
//
// A product whose repo cannot be read (no token for a private repo, GitHub
// down) is left out of the result, and the page keeps its hand-written list.

import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

/** Where each product's code lives: the repo, and the folders that are the product ('' for the whole repo). */
export const sources: Record<string, { repo: string; dirs: string[] }> = {
	// The portfolio itself (apps/web) is in this repo too, and is not Zaur.
	zaur: { repo: 'nomideusz/zaur', dirs: ['apps/mail2', 'apps/music', 'apps/register'] },
	szkolyjogi: { repo: 'nomideusz/asini', dirs: ['apps/yoga'] },
	thebest: { repo: 'nomideusz/asini', dirs: ['apps/thebest'] },
	kino: { repo: 'nomideusz/asini', dirs: ['apps/kino'] },
	kompi: { repo: 'nomideusz/asini', dirs: ['apps/kompi'] },
	festivals: { repo: 'nomideusz/asini', dirs: ['apps/festivals'] },
	radiobartek: { repo: 'nomideusz/radiobartek', dirs: [''] }
};

// Patches count: radiobartek ships as a patch on upstream SUB/WAVE, and its
// zaur-world imports live in the `+` lines of that patch.
const SOURCE = /\.(svelte|ts|tsx|mts|js|jsx|mjs|css|patch|diff)$/;
// Tests and fixtures may import a package the product itself does not ship.
const SKIP = /(^|\/)(node_modules|\.svelte-kit|build|dist|tests?|e2e|__tests__)\/|\.(test|spec)\.[a-z]+$/;
// `from '@nomideusz/x'`, `import '@nomideusz/x/y.css'`, `import('@nomideusz/x')`, CSS `@import '@nomideusz/x'`.
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]@nomideusz\/([a-z0-9-]+)/g;

/** Package ids each product imports, limited to `published` and in its order. */
export async function loadUsage(published: string[]): Promise<Record<string, string[]>> {
	const byRepo = new Map<string, string[]>();
	for (const [id, s] of Object.entries(sources)) byRepo.set(s.repo, [...(byRepo.get(s.repo) ?? []), id]);

	const out: Record<string, string[]> = {};
	await Promise.all(
		[...byRepo].map(async ([repo, ids]) => {
			try {
				const found = await scanRepo(repo, Object.fromEntries(ids.map((id) => [id, sources[id].dirs])));
				for (const id of ids) out[id] = published.filter((p) => found[id].has(p));
			} catch (err) {
				console.warn(`[usage] ${repo}: ${(err as Error).message}; ${ids.join(', ')} keep their hand-written package lists`);
			}
		})
	);
	return out;
}

async function scanRepo(repo: string, products: Record<string, string[]>) {
	const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
	if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	const res = await fetch(`https://api.github.com/repos/${repo}/tarball`, { headers, signal: AbortSignal.timeout(180_000) });
	// A private repo answers 404, not 403, to a request without access.
	if (!res.ok || !res.body) throw new Error(`tarball ${res.status}${res.status === 404 && !process.env.GITHUB_TOKEN ? ' (private repo, no GITHUB_TOKEN)' : ''}`);

	const found = Object.fromEntries(Object.keys(products).map((id) => [id, new Set<string>()]));
	const owners = (path: string) =>
		Object.entries(products)
			.filter(([, dirs]) => dirs.some((d) => d === '' || path.startsWith(`${d}/`)))
			.map(([id]) => id);

	const gz = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream).pipe(createGunzip());
	for await (const file of untar(gz, (path) => SOURCE.test(path) && !SKIP.test(path) && owners(path).length > 0)) {
		// A patch's removed lines are code the product no longer has.
		const text = /\.(patch|diff)$/.test(file.path)
			? file.text
					.split('\n')
					.filter((l) => !l.startsWith('-'))
					.join('\n')
			: file.text;
		for (const m of text.matchAll(IMPORT)) for (const id of owners(file.path)) found[id].add(m[1]);
	}
	return found;
}

/**
 * The regular files of a tar stream whose path passes `want`, with GitHub's
 * top folder (`owner-repo-sha/`) taken off the path. Handles ustar prefixes,
 * pax `path` records and GNU long names; skips everything else without
 * holding it in memory.
 */
async function* untar(stream: AsyncIterable<Buffer>, want: (path: string) => boolean) {
	let buf: Buffer = Buffer.alloc(0);
	let mode: 'header' | 'data' | 'pad' = 'header';
	let remaining = 0;
	let pad = 0;
	let type = '';
	let path = '';
	let keep = false;
	let parts: Buffer[] = [];
	let nextPath: string | undefined;

	const str = (b: Buffer, at: number, len: number) => {
		const s = b.subarray(at, at + len);
		const end = s.indexOf(0);
		return s.toString('utf8', 0, end < 0 ? len : end);
	};

	for await (const chunk of stream) {
		buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
		for (;;) {
			if (mode === 'header') {
				if (buf.length < 512) break;
				const h = buf.subarray(0, 512);
				buf = buf.subarray(512);
				if (h.every((b) => b === 0)) continue;
				const size = parseInt(str(h, 124, 12).trim() || '0', 8);
				type = String.fromCharCode(h[156] || 48);
				const name = str(h, 0, 100);
				const prefix = str(h, 345, 155);
				const full = nextPath ?? (prefix ? `${prefix}/${name}` : name);
				const meta = type === 'x' || type === 'g' || type === 'L';
				if (!meta) nextPath = undefined;
				path = full.replace(/^[^/]*\//, '');
				keep = meta ? type !== 'g' : type === '0' && want(path);
				parts = [];
				remaining = size;
				pad = (512 - (size % 512)) % 512;
				mode = 'data';
			}
			if (mode === 'data') {
				const take = Math.min(remaining, buf.length);
				if (keep) parts.push(buf.subarray(0, take));
				buf = buf.subarray(take);
				remaining -= take;
				if (remaining > 0) break;
				mode = 'pad';
			}
			if (mode === 'pad') {
				const take = Math.min(pad, buf.length);
				buf = buf.subarray(take);
				pad -= take;
				if (pad > 0) break;
				mode = 'header';
				if (!keep) continue;
				const body = Buffer.concat(parts);
				if (type === 'x') {
					// Pax records: "<len> key=value\n"; only the path matters here.
					nextPath = body.toString('utf8').match(/(?:^|\n)\d+ path=([^\n]*)/)?.[1] ?? nextPath;
				} else if (type === 'L') {
					nextPath = str(body, 0, body.length);
				} else {
					yield { path, text: body.toString('utf8') };
				}
			}
		}
	}
}
