/**
 * A subscribed calendar's iCalendar text, fetched here rather than in the
 * browser: Google, iCloud and Outlook send no CORS headers, and the page's CSP
 * keeps it to our own origin.
 *
 * The URL is whatever someone pasted, so an unchecked fetch is SSRF into the
 * internal network. Only https on 443, every address a name resolves to must be
 * public (checked inside the connection's own lookup, so a name cannot answer
 * one address to the check and another to the connect), and each redirect is
 * checked again.
 */
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';

const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

// No ::ffff:0:0/96 rule: BlockList checks an IPv4 address against the IPv6 rules
// as ::ffff:a.b.c.d, so that rule blocks every IPv4 address. A mapped address is
// unwrapped in `isPublicAddress` and checked as IPv4 instead.
const blocked = new BlockList();
for (const [net, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['224.0.0.0', 4],
	['240.0.0.0', 4]
] as const)
	blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
	['::', 128],
	['::1', 128],
	['64:ff9b::', 96],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8]
] as const)
	blocked.addSubnet(net, prefix, 'ipv6');

export function isPublicAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 4) return !blocked.check(address, 'ipv4');
	if (family !== 6) return false;
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
	if (mapped) return !blocked.check(mapped[1]!, 'ipv4');
	return !blocked.check(address, 'ipv6');
}

export class FeedError extends Error {}

/** webcal:// is https:// by another name; anything else that is not https is refused. */
export function feedUrl(raw: string): URL {
	let url: URL;
	try {
		url = new URL(raw.trim().replace(/^webcal:/i, 'https:'));
	} catch {
		throw new FeedError('That is not a link.');
	}
	if (url.protocol !== 'https:') throw new FeedError('Only https:// and webcal:// links can be subscribed to.');
	if (url.port && url.port !== '443') throw new FeedError('Calendar links on other ports are not supported.');
	if (url.username || url.password) throw new FeedError('Links with a password in them are not supported.');
	const host = url.hostname.replace(/^\[|\]$/g, '');
	if (isIP(host) && !isPublicAddress(host)) throw new FeedError('That address is not on the public internet.');
	return url;
}

// The connection's own lookup: Node asks for every address when it races IPv4
// against IPv6 (`all`), and a single one otherwise.
function guardedLookup(
	hostname: string,
	options: { all?: boolean; family?: number },
	callback: (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void
) {
	dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
		if (error) return callback(error, options.all ? [] : '');
		if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
			return callback(Object.assign(new Error('not a public address'), { code: 'EBLOCKED' }), options.all ? [] : '');
		if (options.all) return callback(null, addresses);
		callback(null, addresses[0]!.address, addresses[0]!.family);
	});
}

function get(url: URL, redirects: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const request = https.get(
			url,
			{
				lookup: guardedLookup as never,
				timeout: TIMEOUT_MS,
				headers: { accept: 'text/calendar, */*;q=0.5', 'user-agent': 'Zaur Mail calendar (+https://zaur.app)' }
			},
			(response) => {
				const status = response.statusCode ?? 0;
				if (status >= 300 && status < 400 && response.headers.location) {
					response.resume();
					if (redirects >= MAX_REDIRECTS) return reject(new FeedError('The link redirects too many times.'));
					try {
						return resolve(get(feedUrl(new URL(response.headers.location, url).href), redirects + 1));
					} catch (cause) {
						return reject(cause);
					}
				}
				if (status === 401 || status === 403 || status === 404)
					return response.resume(), reject(new FeedError('The calendar is not there, or not public. Check the link.'));
				if (status < 200 || status >= 300) return response.resume(), reject(new FeedError(`The calendar's server answered ${status}.`));
				let size = 0;
				const chunks: Buffer[] = [];
				response.on('data', (chunk: Buffer) => {
					size += chunk.length;
					if (size > MAX_BYTES) {
						request.destroy();
						reject(new FeedError('That calendar is larger than 10 MB.'));
					} else chunks.push(chunk);
				});
				response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
				response.on('error', reject);
			}
		);
		request.on('timeout', () => request.destroy(new FeedError('The calendar took too long to answer.')));
		request.on('error', (cause: NodeJS.ErrnoException) =>
			reject(cause instanceof FeedError ? cause : new FeedError(cause.code === 'EBLOCKED' ? 'That address is not on the public internet.' : 'The calendar could not be reached.'))
		);
	});
}

/** The feed's text, checked to be iCalendar. */
export async function fetchFeed(raw: string): Promise<string> {
	const text = await get(feedUrl(raw), 0);
	if (!/^\s*BEGIN:VCALENDAR/i.test(text.replace(/^﻿/, ''))) throw new FeedError('That link is not an iCalendar (.ics) calendar.');
	return text;
}

// ponytail: in memory, per process, ten minutes a copy; a restart fetches again.
// Feeds from Google and Outlook only change every few hours anyway.
const FRESH_MS = 10 * 60_000;
const copies = new Map<string, { at: number; text: Promise<string> }>();

export function cachedFeed(raw: string): Promise<string> {
	const hit = copies.get(raw);
	if (hit && Date.now() - hit.at < FRESH_MS) return hit.text;
	if (copies.size > 500) copies.clear();
	const text = fetchFeed(raw);
	copies.set(raw, { at: Date.now(), text });
	// A failure is not remembered.
	text.catch(() => copies.delete(raw));
	return text;
}
