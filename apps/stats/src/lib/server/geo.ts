/**
 * An address to a place and a network, without asking anyone: DB-IP's free city
 * and ASN databases, downloaded to the volume and read in memory (CC BY 4.0, so
 * the dashboard's footer names them). Until they arrive a view simply has no
 * place. zaur.app alone also asks ipapi.is, as it did before this app existed.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { Reader, type Response as MmdbRecord } from 'mmdb-lib';
import type { Place } from './ingest';

type CityRecord = {
	city?: { names?: { en?: string } };
	subdivisions?: { names?: { en?: string } }[];
	country?: { iso_code?: string; names?: { en?: string } };
};
type AsnRecord = { autonomous_system_organization?: string };

const dir = () => process.env.GEO_DIR?.trim() || './data/geo';
const REFRESH_MS = 35 * 86_400_000;
let city: Reader<MmdbRecord> | undefined;
let asn: Reader<MmdbRecord> | undefined;

const month = (back: number) => {
	const d = new Date();
	d.setUTCDate(1);
	d.setUTCMonth(d.getUTCMonth() - back);
	return d.toISOString().slice(0, 7);
};

async function fetchDb(kind: 'city' | 'asn', file: string): Promise<void> {
	// The month's file appears a few days into the month.
	for (const m of [month(0), month(1)]) {
		const res = await fetch(`https://download.db-ip.com/free/dbip-${kind}-lite-${m}.mmdb.gz`, {
			headers: { 'user-agent': 'zaur-stats' },
			signal: AbortSignal.timeout(300_000)
		});
		if (!res.ok || !res.body) continue;
		const tmp = `${file}.tmp`;
		await pipeline(Readable.fromWeb(res.body as never), createGunzip(), createWriteStream(tmp));
		renameSync(tmp, file);
		return;
	}
	throw new Error(`no ${kind} database to download`);
}

async function refresh(kind: 'city' | 'asn'): Promise<void> {
	const file = join(dir(), `${kind}.mmdb`);
	mkdirSync(dir(), { recursive: true });
	if (!existsSync(file) || Date.now() - statSync(file).mtimeMs > REFRESH_MS) await fetchDb(kind, file);
	if (kind === 'city') city = new Reader<MmdbRecord>(readFileSync(file));
	else asn = new Reader<MmdbRecord>(readFileSync(file));
}

/** Boot and then daily; a failed download leaves the old file or no places, never a failed page. */
export function startGeo(): void {
	const run = () =>
		Promise.all((['city', 'asn'] as const).map((k) => refresh(k).catch((err) => console.error('[geo]', k, (err as Error).message))));
	void run();
	setInterval(run, 86_400_000).unref();
}

const PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/;

export function offlinePlace(ip: string): Place {
	if (!ip || PRIVATE.test(ip)) return {};
	try {
		const c = city?.get(ip) as unknown as CityRecord | null | undefined;
		const a = asn?.get(ip) as unknown as AsnRecord | null | undefined;
		return {
			city: c?.city?.names?.en,
			region: c?.subdivisions?.[0]?.names?.en,
			country: c?.country?.names?.en,
			org: a?.autonomous_system_organization
		};
	} catch {
		return {};
	}
}

// What an address says at ipapi.is: the network's owner (a company on an office
// network, else the ISP) and the place. Without IPAPI_KEY the free tier answers
// flat strings; with one it nests them and adds the owner's kind and the
// data-centre, VPN and mobile flags. A flat company is sometimes a kind ("cloud")
// or a netblock's name, never a spaced company name; then the owner comes from
// "AS8075 Microsoft Corporation".
const text = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined);
export function network(d: Record<string, any>): Place {
	const flat = typeof d.company === 'string' && !/\s/.test(d.company) && typeof d.asn === 'string' ? d.asn.replace(/^AS\d+\s+/, '') : d.company;
	const company = typeof d.company === 'object' ? d.company : { name: flat };
	const loc = typeof d.location === 'object' ? d.location : d;
	return {
		org: text(company?.name, 80),
		orgType: text(company?.type, 20),
		city: text(loc.city, 60),
		region: text(loc.region ?? loc.state, 60),
		country: text(loc.country, 60),
		hosting: d.is_datacenter || company?.type === 'hosting' ? 1 : undefined,
		vpn: d.is_vpn || d.is_proxy || d.is_tor ? 1 : undefined,
		mobile: d.is_mobile ? 1 : undefined
	};
}

const lookups = new Map<string, { at: number; value: Promise<Place> }>();
export function ipapiPlace(ip: string): Promise<Place> {
	if (!ip || PRIVATE.test(ip)) return Promise.resolve({});
	const hit = lookups.get(ip);
	if (hit && Date.now() - hit.at < 86_400_000) return hit.value;
	if (lookups.size > 5000) lookups.clear();
	const key = process.env.IPAPI_KEY ? `&key=${encodeURIComponent(process.env.IPAPI_KEY)}` : '';
	const value = fetch(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}${key}`, { signal: AbortSignal.timeout(3000) })
		.then((res) => (res.ok ? res.json() : Promise.reject(new Error(`ipapi ${res.status}`))))
		.then(network)
		.catch((err) => {
			console.error('[geo]', (err as Error).message);
			lookups.delete(ip);
			return {};
		});
	lookups.set(ip, { at: Date.now(), value });
	return value;
}
