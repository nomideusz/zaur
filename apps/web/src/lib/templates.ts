// The Railway templates table, built at prerender. The list is every GitHub repo
// with the railway-template topic: the README's deploy button gives the template
// code, and Railway's public API gives the blurb and whether it is still published.
// So a new template repo needs no change here; it only needs a group below.

// The first owner wins when a template still has a repo under both.
const owners = ['two-workspaces', 'nomideusz'];
const referral = 'sLjDXb';
// Templates whose source is not a template repo of its own: [code, source].
const extra = [
	['sveltekit-better-auth-starter', 'https://github.com/nomideusz/sveltekit-better-auth-starter'],
	['stalwart-webmail', 'https://github.com/nomideusz/zaur/tree/main/apps/mail2']
];

// Groups in display order, keyed by repo name without "-railway"; each lists
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
		['odoo', 'erpnext', 'twenty', 'espocrm', 'evo-crm', 'chatwoot', 'zammad', 'invoiceninja', 'lago', 'medusa', 'mautic', 'dittofeed',
		'formbricks', 'calcom', 'documenso', 'datalens', 'openemr']
	],
	[
		'Work and chat',
		['affine', 'outline', 'huly', 'plane', 'openproject', 'teable', 'penpot', 'moodle', 'rocketchat', 'fluxer', 'stalwart', 'stalwart-webmail']
	],
	[
		'Media and community',
		['subwave', 'navidrome', 'funkwhale', 'azuracast', 'owncast', 'oryx', 'peertube', 'mediacms', 'invidious', 'tubearchivist', 'audiobookshelf',
		'pixelfed', 'chevereto', 'neko']
	],
	['Browsers in the cloud', ['chrome', 'chromium', 'ungoogled-chromium', 'brave', 'firefox', 'librewolf', 'mullvad', 'edge', 'vivaldi', 'opera']],
	['Desktop apps in the cloud', ['vscodium', 'obsidian', 'libreoffice', 'genoffice', 'thunderbird', 'gimp', 'blender', 'filezilla']],
	['Linux machines', ['terminal', 'webtop', 'webtop-kde', 'webtop-mate', 'webtop-i3', 'webtop-lxqt', 'webtop-debian', 'webtop-arch', 'webtop-alpine']],
	['Sites, games and more', ['wordpress', 'cockpit', 'minecraft-crafty', 'mcsmanager', 'lnbits', 'babybuddy']]
];
const byCategory: Record<string, string> = { 'AI/ML': 'AI and agents', Observability: 'Observability', Automation: 'Developer and automation', Queues: 'Developer and automation' };

export type Template = { slug: string; name: string; desc: string; deploy: string; source: string };
type Fetch = typeof fetch;
type Repo = { name: string; full_name: string; html_url: string; default_branch: string; owner: { login: string } };

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

export async function loadTemplates(f: Fetch) {
	// Unauthenticated works (a few calls a build); a token only lifts the rate limit.
	const headers: Record<string, string> = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
	const q = `topic:railway-template archived:false ${owners.map((o) => `user:${o}`).join(' ')}`;
	const repos: Repo[] = [];
	for (let page = 1; ; page++) {
		const r = await json(f, `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100&page=${page}`, { headers });
		repos.push(...r.items);
		if (repos.length >= r.total_count || !r.items.length) break;
	}
	repos.sort((a, b) => owners.indexOf(a.owner.login) - owners.indexOf(b.owner.login));

	const found = await Promise.all(
		repos.map(async (r) => {
			const md = await f(`https://raw.githubusercontent.com/${r.full_name}/${r.default_branch}/README.md`).then((x) => (x.ok ? x.text() : ''))
				.catch(() => '');
			return { slug: r.name.replace(/-railway$/, ''), source: r.html_url, ...readme(md) };
		})
	);
	const seen = new Set<string>();
	const picked: { slug: string; source: string; code: string; name?: string }[] = [];
	for (const t of [...found, ...extra.map(([code, source]) => ({ slug: code, source, code, name: undefined }))]) {
		if (!t.code || seen.has(t.slug) || seen.has(t.code)) continue;
		seen.add(t.slug).add(t.code);
		picked.push({ ...t, code: t.code });
	}

	// One aliased query per 50 codes keeps under Railway's query-breadth limit.
	const meta: Record<string, { name: string; description: string; category: string; status: string } | null> = {};
	for (let i = 0; i < picked.length; i += 50) {
		const chunk = picked.slice(i, i + 50);
		const query = `{${chunk.map((t, j) => `t${j}: template(code: ${JSON.stringify(t.code)}) { name description category status }`).join(' ')}}`;
		const r = await json(f, 'https://backboard.railway.com/graphql/v2', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query })
		});
		chunk.forEach((t, j) => (meta[t.code] = r.data?.[`t${j}`] ?? null));
	}

	const list = picked.flatMap((t) => {
		const m = meta[t.code];
		if (m?.status !== 'PUBLISHED') return [];
		const kind = kinds.find(([, slugs]) => slugs.includes(t.slug))?.[0] ?? byCategory[m.category] ?? kinds[kinds.length - 1][0];
		const item: Template = {
			slug: t.slug,
			name: t.name ?? m.name.split(' | ')[0],
			desc: m.description,
			deploy: `https://railway.com/deploy/${t.code}?referralCode=${referral}`,
			source: t.source
		};
		return [{ kind, item }];
	});
	if (list.length < 50) throw new Error(`Only ${list.length} Railway templates found; refusing to ship a gutted table`);

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
				.sort((a, b) => rank(kind, a.slug) - rank(kind, b.slug) || a.name.localeCompare(b.name))
		}))
		.filter((g) => g.items.length);
}
