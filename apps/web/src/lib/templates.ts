// The Railway templates table, built at prerender. The list comes from
// Dispatcher (dispatcher.zaur.app), which samples the workspace hourly: every
// PUBLISHED template, the kind set on its dashboard, and Railway's project
// counts. GitHub repos with the railway-template topic add the source link and
// the README title (the deploy button gives the template code), and Railway's
// public API the blurb. Only public repos are linked: some template sources are
// private on purpose, and the old public nomideusz/*-railway copies are not
// linked, since they may hold code that has since gone private. A new template needs no change here: the `kinds` map
// below only places and orders templates more finely than Dispatcher's kind.
// If Dispatcher is down, the list falls back to the GitHub repos alone.

// Template repos live in the two-workspaces org.
const owner = 'two-workspaces';
const referral = 'sLjDXb';
// Templates whose source is not a template repo of its own: [code, source].
const extra = [
	['sveltekit-better-auth-starter', 'https://github.com/nomideusz/sveltekit-better-auth-starter'],
	['stalwart-webmail', 'https://github.com/two-workspaces/webmail']
];

// Groups in display order, keyed by repo name; each lists
// its templates in display order. An unlisted repo goes by its Railway category,
// else to the last group.
export const kinds: [kind: string, slugs: string[]][] = [
	[
		'AI and agents',
		['claude-code', 'opencode', 'codewhale', 't3code', 'orca', 'hermes', 'openworker', 'paperclip', 'aionui', 'lobe-chat', 'open-webui-litellm',
		'dify', 'flowise', 'langflow', 'sim', 'ragflow', 'morphik', 'airweave', 'firecrawl', 'openconnector', 'skillhub', 'moli', 'inbox-zero', 'laya']
	],
	['Observability', ['langfuse', 'opik', 'laminar', 'rustrak', 'hyperdx', 'uptrace', 'openreplay', 'goalert', 'dependency-track']],
	[
		'Developer and automation',
		['infisical', 'appwrite', 'windmill', 'temporal', 'n8n-queue', 'activepieces', 'evolution-n8n', 'lowcoder', 'rei3', 'sveltekit-better-auth-starter']
	],
	[
		'Business',
		['odoo', 'erpnext', 'twenty', 'espocrm', 'evo-crm', 'chatwoot', 'zammad', 'invoiceninja', 'lago', 'medusa', 'mautic', 'postiz', 'dittofeed',
		'formbricks', 'typebot', 'calcom', 'documenso', 'datalens', 'metabase', 'umami', 'openemr']
	],
	[
		'Work and chat',
		['affine', 'outline', 'huly', 'plane', 'openproject', 'teable', 'nocodb', 'penpot', 'moodle', 'rocketchat', 'fluxer', 'stalwart-v1', 'stalwart-webmail']
	],
	[
		'Media and community',
		['subwave', 'navidrome', 'funkwhale', 'azuracast', 'owncast', 'oryx', 'peertube', 'mediacms', 'invidious', 'tubearchivist', 'audiobookshelf',
		'pixelfed', 'chevereto', 'neko']
	],
	['Browsers in the cloud', ['chrome', 'chromium', 'ungoogled-chromium', 'brave', 'firefox', 'librewolf', 'mullvad', 'edge', 'vivaldi', 'opera']],
	['Desktop apps in the cloud', ['vscodium', 'obsidian', 'libreoffice', 'genoffice', 'thunderbird', 'gimp', 'blender', 'filezilla']],
	['Linux machines', ['terminal', 'webtop', 'webtop-kde', 'webtop-mate', 'webtop-i3', 'webtop-lxqt', 'webtop-debian', 'webtop-arch', 'webtop-alpine']],
	['Sites, games and more', ['wordpress', 'ghost', 'cockpit', 'directus', 'minecraft-crafty', 'horizon', 'mcsmanager', 'lnbits', 'babybuddy']]
];
const byCategory: Record<string, string> = { 'AI/ML': 'AI and agents', Observability: 'Observability', Automation: 'Developer and automation', Queues: 'Developer and automation' };
// Dispatcher's kinds, for a template the map above does not list.
const byKind: Record<string, string> = {
	ai: 'AI and agents',
	agent: 'AI and agents',
	devtools: 'Developer and automation',
	business: 'Business',
	media: 'Media and community',
	desktop: 'Desktop apps in the cloud'
};
const dispatcher = process.env.DISPATCHER_URL ?? 'https://dispatcher.zaur.app';

export type Template = { slug: string; name: string; desc: string; deploy: string; source?: string; deploys: number; running: number };
type Fetch = typeof fetch;
type Repo = { name: string; full_name: string; html_url: string; default_branch: string; private: boolean };
type Listed = { code: string; slug: string; source?: string; name?: string; title?: string; kind?: string; deploys?: number; running?: number };
type Meta = { name: string; description: string; category: string; status: string; projects: number; activeProjects: number };

async function json(f: Fetch, url: string, init?: RequestInit, retry = true): Promise<any> {
	const r = await f(url, init);
	// GitHub search allows 10 unauthenticated calls a minute; two builds close together can hit it.
	if ((r.status === 403 || r.status === 429) && retry) {
		await new Promise((done) => setTimeout(done, 61_000));
		return json(f, url, init, false);
	}
	if (!r.ok) throw new Error(`${url}: ${r.status}`);
	return r.json();
}

/** The deploy button's template code and the title, from a template README. */
export function readme(md: string) {
	const code = md.match(/button\.svg\)\]\(https:\/\/railway\.com\/(?:new\/template|deploy)\/([\w-]+)/)?.[1];
	const name = md.match(/^#\s+(?:Deploy and Host\s+)?(?:an?\s+)?(.+?)(?:\s+\(Cloud Browser\))?\s+on Railway\s*$/m)?.[1];
	return { code, name };
}

/** Every public template repo by its deploy code. */
async function repos(f: Fetch) {
	// Unauthenticated works (a few calls a build); a token only lifts the rate limit.
	const headers: Record<string, string> = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
	// is:public keeps private repos out even when the token could see them.
	const q = `topic:railway-template archived:false is:public user:${owner}`;
	const list: Repo[] = [];
	for (let page = 1; ; page++) {
		const r = await json(f, `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100&page=${page}`, { headers });
		list.push(...r.items.filter((x: Repo) => !x.private));
		if (page * 100 >= r.total_count || !r.items.length) break;
	}

	const found = await Promise.all(
		list.map(async (r) => {
			const md = await f(`https://raw.githubusercontent.com/${r.full_name}/${r.default_branch}/README.md`).then((x) => (x.ok ? x.text() : ''))
				.catch(() => '');
			return { slug: r.name, source: r.html_url, ...readme(md) };
		})
	);
	const seen = new Set<string>();
	const byCode = new Map<string, Listed>();
	for (const t of [...found, ...extra.map(([code, source]) => ({ slug: code, source, code, name: undefined }))]) {
		if (!t.code || seen.has(t.slug) || seen.has(t.code)) continue;
		seen.add(t.slug).add(t.code);
		byCode.set(t.code, { ...t, code: t.code });
	}
	return byCode;
}

/** Dispatcher's published templates, or null when it cannot be reached. */
async function catalog(f: Fetch): Promise<{ code: string; name: string; kind: string; projects: number; activeProjects: number }[] | null> {
	try {
		const r = await f(`${dispatcher}/api/catalog`, { signal: AbortSignal.timeout(15_000) });
		if (!r.ok) throw new Error(`${r.status}`);
		const { templates } = await r.json();
		if (!Array.isArray(templates) || !templates.length) throw new Error('no templates');
		return templates;
	} catch (e) {
		console.warn(`Dispatcher catalog unavailable (${(e as Error).message}); listing the GitHub template repos`);
		return null;
	}
}

/** Railway's public blurb, status and counts per code. */
export async function railwayMeta(f: Fetch, codes: string[]) {
	const meta: Record<string, Meta | null> = {};
	const ask = async (chunk: string[]) => {
		const query = `{${chunk.map((c, j) => `t${j}: template(code: ${JSON.stringify(c)}) { name description category status projects activeProjects }`).join(' ')}}`;
		const r = await json(f, 'https://backboard.railway.com/graphql/v2', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query })
		});
		return chunk.map((_, j) => (r.data?.[`t${j}`] ?? null) as Meta | null);
	};
	// One aliased query per 50 codes keeps under Railway's query-breadth limit.
	for (let i = 0; i < codes.length; i += 50) {
		const chunk = codes.slice(i, i + 50);
		let got = await ask(chunk);
		// One unknown code (a README pointing at a deleted template) makes Railway
		// answer the whole query with data: null, so ask a failed chunk code by code.
		if (got.every((m) => m === null)) got = await Promise.all(chunk.map((c) => ask([c]).then(([m]) => m).catch(() => null)));
		chunk.forEach((c, j) => (meta[c] = got[j]));
	}
	return meta;
}

export async function loadTemplates(f: Fetch) {
	const [byCode, listed] = await Promise.all([repos(f), catalog(f)]);
	// A template without a repo goes by its code, unless a repo already has that
	// name for another template (rows are keyed and linked by slug).
	const taken = new Set([...byCode.values()].map((t) => t.slug));
	const slugFor = (code: string) => {
		const repo = byCode.get(code);
		if (repo) return repo.slug;
		let slug = code;
		for (let n = 2; taken.has(slug); n++) slug = `${code}-${n}`;
		taken.add(slug);
		return slug;
	};
	const picked: Listed[] = listed
		? listed.map((t) => ({
				...byCode.get(t.code),
				code: t.code,
				slug: slugFor(t.code),
				title: t.name,
				kind: t.kind,
				deploys: t.projects,
				running: t.activeProjects
			}))
		: [...byCode.values()];
	const meta = await railwayMeta(f, picked.map((t) => t.code));

	const list = picked.flatMap((t) => {
		const m = meta[t.code];
		// Dispatcher already lists only published templates; Railway's blurb may still be missing.
		if (!listed && m?.status !== 'PUBLISHED') return [];
		const name = t.name ?? (m?.name ?? t.title)?.split(' | ')[0];
		if (!name) return [];
		const kind =
			kinds.find(([, slugs]) => slugs.includes(t.slug))?.[0] ??
			(t.kind && byKind[t.kind]) ??
			(m && byCategory[m.category]) ??
			kinds[kinds.length - 1][0];
		const item: Template = {
			slug: t.slug,
			name,
			desc: m?.description ?? '',
			deploy: `https://railway.com/deploy/${t.code}?referralCode=${referral}`,
			source: t.source,
			deploys: t.deploys ?? m?.projects ?? 0,
			running: t.running ?? m?.activeProjects ?? 0
		};
		return [{ kind, item }];
	});
	if (list.length < 50) throw new Error(`Only ${list.length} Railway templates found; refusing to ship a gutted table`);

	// Hand-placed templates first in their order, then the rest by how many run.
	const rank = (kind: string, slug: string) => {
		const i = kinds.find(([k]) => k === kind)?.[1].indexOf(slug) ?? -1;
		return i < 0 ? Infinity : i;
	};
	return kinds
		.map(([kind]) => ({
			kind,
			items: list
				.filter((x) => x.kind === kind)
				.map((x) => x.item)
				.sort((a, b) => rank(kind, a.slug) - rank(kind, b.slug) || b.running - a.running || a.name.localeCompare(b.name))
		}))
		.filter((g) => g.items.length);
}
