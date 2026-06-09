import fs from 'fs';

function slug(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

const files = [
	['src/lib/settings/sections/appearance.svelte', '/settings/account'],
	['src/lib/settings/sections/account.svelte', '/settings/account'],
	['src/lib/settings/sections/reading.svelte', '/settings/reading'],
	['src/lib/settings/sections/writing.svelte', '/settings/compose'],
	['src/lib/settings/sections/shortcuts.svelte', '/settings/shortcuts']
];

const entries = [];
const seen = new Set();

for (const [file, href] of files) {
	const src = fs.readFileSync(file, 'utf8');

	const rowRe = /<(SettingsRow|SettingsField)\s+[^>]*title="([^"]+)"[^>]*(?:\s+description="([^"]*)")?/g;
	let m;
	while ((m = rowRe.exec(src)) !== null) {
		const title = m[2];
		const description = m[3] ?? '';
		const publicHref = href;
		const id = `${publicHref}-${slug(title)}`;
		if (seen.has(id)) continue;
		seen.add(id);
		entries.push({ id, href: publicHref, title, description });
	}
}

entries.sort((a, b) => a.id.localeCompare(b.id));

const searchIndex = `export type SettingsSearchEntry = {
	id: string;
	title: string;
	description: string;
	href: string;
};

export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = ${JSON.stringify(entries, null, '\t')};
`;

fs.writeFileSync('src/lib/settings/search-index.ts', searchIndex);
console.log(`Wrote ${entries.length} search entries`);
