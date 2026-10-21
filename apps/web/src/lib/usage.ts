// Which of my packages each product is built from, and at which version, read
// at prerender from the products' own code. Each repo is downloaded once as a
// tarball and streamed: only source files inside the product's folders and the
// lockfiles are kept. A product's `@nomideusz/*` imports say which packages it
// uses (imports, not package.json: the asini apps import svelte-i18n through
// the workspace without declaring it); its lockfile says which version it runs.
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
	// The client's own repo, not mine: reading it needs a token with access to it.
	fixtar: { repo: 'nataliya-varna/fixtar', dirs: [''] },
	radiobartek: { repo: 'nomideusz/radiobartek', dirs: [''] },
	kurcz: { repo: 'nomideusz/kurcz', dirs: [''] }
};

/** A version a product runs, or 'workspace' when it builds the package from source beside it. */
export type Usage = { uses: Record<string, string[]>; versions: Record<string, Record<string, string>> };

// Patches count: radiobartek ships as a patch on upstream SUB/WAVE, and its
// zaur-world imports (and the lockfile lines that pin it) live in the `+`
// lines of that patch.
const SOURCE = /\.(svelte|astro|ts|tsx|mts|js|jsx|mjs|css|patch|diff)$/;
const LOCK = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/;
// Tests and fixtures may import a package the product itself does not ship.
const SKIP = /(^|\/)(node_modules|\.svelte-kit|build|dist|tests?|e2e|__tests__)\/|\.(test|spec)\.[a-z]+$/;
// `from '@nomideusz/x'`, `import '@nomideusz/x/y.css'`, `import('@nomideusz/x')`, CSS `@import '@nomideusz/x'`.
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]@nomideusz\/([a-z0-9-]+)/g;
// A registry tarball, as package-lock.json, yarn.lock and patched lockfiles name it.
const TARBALL = /@nomideusz\/([a-z0-9-]+)\/-\/\1-(\d+\.\d+\.\d+[\w.-]*?)\.tgz/g;

/** Package ids each product imports (limited to `published`, in its order) and the versions it runs. */
export async function loadUsage(published: string[]): Promise<Usage> {
	const byRepo = new Map<string, string[]>();
	for (const [id, s] of Object.entries(sources)) byRepo.set(s.repo, [...(byRepo.get(s.repo) ?? []), id]);

	const out: Usage = { uses: {}, versions: {} };
	await Promise.all(
		[...byRepo].map(async ([repo, ids]) => {
			try {
				const found = await scanRepo(repo, Object.fromEntries(ids.map((id) => [id, sources[id].dirs])));
				for (const id of ids) {
					out.uses[id] = published.filter((p) => found[id].uses.has(p));
					out.versions[id] = Object.fromEntries(out.uses[id].flatMap((p) => (found[id].versions[p] ? [[p, found[id].versions[p]]] : [])));
				}
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

	const found = Object.fromEntries(Object.keys(products).map((id) => [id, { uses: new Set<string>(), versions: {} as Record<string, string> }]));
	const owners = (path: string) =>
		Object.entries(products)
			.filter(([, dirs]) => dirs.some((d) => d === '' || path.startsWith(`${d}/`)))
			.map(([id]) => id);
	/** Record a version for a product, keeping the oldest when its apps differ. */
	const pin = (id: string, pkg: string, v: string) => {
		const had = found[id].versions[pkg];
		if (!had || (v !== 'workspace' && (had === 'workspace' || older(v, had)))) found[id].versions[pkg] = v;
	};

	const gz = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream).pipe(createGunzip());
	const want = (path: string) =>
		!SKIP.test(path) && ((SOURCE.test(path) && owners(path).length > 0) || (LOCK.test(path) && (!path.includes('/') || owners(path).length > 0)));
	for await (const file of untar(gz, want)) {
		// A patch's removed lines are code the product no longer has.
		const text = /\.(patch|diff)$/.test(file.path)
			? file.text
					.split('\n')
					.filter((l) => !l.startsWith('-'))
					.join('\n')
			: file.text;
		// A lockfile at the root speaks for every product in the repo; one in a folder for that folder's product.
		const ids = file.path.includes('/') ? owners(file.path) : Object.keys(products);
		if (file.path.endsWith('pnpm-lock.yaml')) {
			const base = file.path.replace(/pnpm-lock\.yaml$/, '');
			for (const [importer, deps] of pnpmImporters(text)) {
				const at = (base + (importer === '.' ? '' : importer)).replace(/\/$/, '');
				for (const id of ids) {
					if (!products[id].some((d) => d === at || (d === '' && at === base.replace(/\/$/, '')))) continue;
					for (const [pkg, v] of Object.entries(deps)) pin(id, pkg, v);
				}
			}
			continue;
		}
		for (const m of text.matchAll(TARBALL)) for (const id of ids) pin(id, m[1], m[2]);
		if (LOCK.test(file.path)) continue;
		for (const m of text.matchAll(IMPORT)) for (const id of owners(file.path)) found[id].uses.add(m[1]);
	}
	return found;
}

/**
 * The `@nomideusz/*` versions each importer of a pnpm lockfile (v6–v9) resolves:
 * `importers:` → `  apps/mail2:` → `      '@nomideusz/x':` → `        version: 1.2.3(peer@…)`.
 * A workspace link (`link:…`) means the package is built from source beside it.
 */
function pnpmImporters(yaml: string) {
	const out = new Map<string, Record<string, string>>();
	let inImporters = false;
	let importer = '';
	let pkg = '';
	for (const line of yaml.split('\n')) {
		if (/^\S/.test(line)) {
			inImporters = line.startsWith('importers:');
			continue;
		}
		if (!inImporters) continue;
		const imp = line.match(/^ {2}(\S[^:]*):\s*$/);
		if (imp) {
			importer = imp[1].replace(/^['"]|['"]$/g, '');
			out.set(importer, {});
			continue;
		}
		const dep = line.match(/^ {6}'?@nomideusz\/([a-z0-9-]+)'?:\s*(\S.*)?$/);
		if (dep) {
			pkg = dep[1];
			// Older lockfiles put the version on the same line.
			if (dep[2]) out.get(importer)![pkg] = version(dep[2]);
			continue;
		}
		const ver = line.match(/^ {8}version:\s*(\S+)/);
		if (ver && pkg) {
			out.get(importer)![pkg] = version(ver[1]);
			pkg = '';
		} else if (/^ {6}\S/.test(line)) pkg = '';
	}
	return out;
}

const version = (v: string) => (v.startsWith('link:') || v.startsWith('workspace:') ? 'workspace' : v.replace(/^['"]|['"]$/g, '').replace(/\(.*$/, ''));

/** Whether semver `a` is older than `b`, by major.minor.patch. */
function older(a: string, b: string) {
	const pa = a.split(/[.-]/).map(Number);
	const pb = b.split(/[.-]/).map(Number);
	for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0);
	return false;
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
