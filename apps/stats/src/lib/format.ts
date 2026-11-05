import { SITES, siteById } from '#lib/sites';

const TZ = 'Europe/Warsaw';
export const nf = new Intl.NumberFormat('en-GB');
export const secs = (s: number | null | undefined) => (s == null ? '—' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
export const when = (t: number) => new Date(t).toLocaleString('en-GB', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
export const clock = (t: number) => new Date(t).toLocaleTimeString('en-GB', { timeZone: TZ });
export const siteName = (id: string) => siteById(id)?.name ?? id;
/** A link back to the page a row speaks of. A site's subdomain view keeps its own host. */
export function pageHref(site: string, path: string, host?: string | null): string {
	const s = siteById(site) ?? SITES[0];
	return `https://${host || s.hosts[0]}${path}`;
}
export const device = (v: { device: string | null; w: number | null }) => (v.device === 'phone' || (v.w ?? 2000) < 768 ? 'phone' : (v.w ?? 2000) < 1100 ? 'tablet' : 'desktop');
export const place = (v: { city: string | null; country: string | null; tz: string | null }) =>
	v.city ? `${v.city}, ${v.country ?? ''}` : v.country || (v.tz ? v.tz.split('/').pop()!.replace(/_/g, ' ') : '');
