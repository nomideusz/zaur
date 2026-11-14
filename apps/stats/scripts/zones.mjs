// Writes src/lib/server/zones.json: each time zone name a browser can report,
// with the countries whose clocks keep it. From the system's tzdata, links
// (Asia/Calcutta, Europe/Kiev) resolved to their zone. Run again when tzdata moves.
//   node scripts/zones.mjs
import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = '/usr/share/zoneinfo';
const zones = new Map();
for (const tab of ['zone.tab', 'zone1970.tab']) {
	for (const line of readFileSync(join(ROOT, tab), 'utf8').split('\n')) {
		if (!line || line.startsWith('#')) continue;
		const [codes, , zone] = line.split('\t');
		const set = zones.get(zone) ?? new Set();
		for (const c of codes.split(',')) set.add(c);
		zones.set(zone, set);
	}
}
const out = {};
const walk = (dir) => {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		const st = lstatSync(path);
		if (st.isDirectory()) {
			if (!['posix', 'right'].includes(name)) walk(path);
			continue;
		}
		const zone = relative(ROOT, path);
		if (!/^(Europe|Asia|Africa|America|Australia|Pacific|Atlantic|Indian|Antarctica|Arctic)\//.test(zone)) continue;
		const target = relative(ROOT, realpathSync(path));
		const set = zones.get(zone) ?? zones.get(target);
		if (set) out[zone] = [...set].sort().join(' ');
	}
};
walk(ROOT);
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL('../src/lib/server/zones.json', import.meta.url), JSON.stringify(sorted, null, '\t') + '\n');
console.log(Object.keys(sorted).length, 'zones');
