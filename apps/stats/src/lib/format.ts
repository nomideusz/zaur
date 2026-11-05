import { SITES, siteById } from '#lib/sites';

const TZ = 'Europe/Warsaw';
export const nf = new Intl.NumberFormat('en-GB');
export const secs = (s: number | null | undefined) => (s == null ? '—' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
export const when = (t: number) => new Date(t).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const clock = (t: number) => new Date(t).toLocaleTimeString('en-GB', { timeZone: TZ });
/** "1 page opened", "3 pages opened": the words after a count. */
export const opened = (n: number) => (n === 1 ? 'page opened' : 'pages opened');
export const siteName = (id: string) => siteById(id)?.name ?? id;
/** A site's number in the catalogue, the same everywhere: its place in SITES, and the key that opens it. */
export const siteNo = (id: string) => String(SITES.findIndex((s) => s.id === id) + 1).padStart(2, '0');
/** 2026-11-03 as "Tue 3 Nov". Days here are already Warsaw's, so noon UTC only keeps the date whole. */
export const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
export const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;
/** Date arithmetic for the browser: days are strings, read at noon UTC so a date stays whole. */
export const addDayStr = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** The change between two periods, or nothing worth saying. */
export function change(now: number, was: number | null): string {
	if (was == null) return '—';
	if (was === 0) return now ? 'new' : '—';
	const p = Math.round((100 * (now - was)) / was);
	return `${p >= 0 ? '+' : '−'}${Math.abs(p)}%`;
}
/** A link back to the page a row speaks of. A site's subdomain view keeps its own host. */
export function pageHref(site: string, path: string, host?: string | null): string {
	const s = siteById(site) ?? SITES[0];
	return `https://${host || s.hosts[0]}${path}`;
}
export const device = (v: { device: string | null; w: number | null }) => (v.device === 'phone' || (v.w ?? 2000) < 768 ? 'phone' : (v.w ?? 2000) < 1100 ? 'tablet' : 'desktop');
export const place = (v: { city: string | null; country: string | null; tz: string | null }) =>
	v.city ? `${v.city}, ${v.country ?? ''}` : v.country || (v.tz ? v.tz.split('/').pop()!.replace(/_/g, ' ') : '');
