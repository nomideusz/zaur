// A tiny in-memory JMAP server speaking just enough of Stalwart's dialect to
// exercise mail2's remote functions end to end: session, mailboxes, contacts
// (RFC 9610), calendars, and the urn:stalwart:jmap self-service objects.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = 9911;
const BASE = `http://127.0.0.1:${PORT}`;
const ACC = 'acc1';
const CORE = 'urn:ietf:params:jmap:core';
const MAIL = 'urn:ietf:params:jmap:mail';
const CONTACTS = 'urn:ietf:params:jmap:contacts';
const CALENDARS = 'urn:ietf:params:jmap:calendars';
const SIEVE = 'urn:ietf:params:jmap:sieve';
const STALWART = 'urn:stalwart:jmap';

const session = {
	username: 'smoke@zaur.app',
	apiUrl: `${BASE}/jmap`,
	downloadUrl: `${BASE}/jmap/download/{accountId}/{blobId}/{name}?accept={type}`,
	uploadUrl: `${BASE}/jmap/upload/{accountId}/`,
	eventSourceUrl: `${BASE}/jmap/eventsource/?types={types}&closeafter={closeafter}&ping={ping}`,
	state: 's1',
	capabilities: {
		[CORE]: { maxObjectsInGet: 500 },
		[MAIL]: {},
		[CONTACTS]: {},
		[CALENDARS]: {},
		[SIEVE]: { extensions: ['fileinto', 'imap4flags'] },
		[STALWART]: {}
	},
	accounts: {
		[ACC]: {
			name: 'smoke@zaur.app',
			isPersonal: true,
			isReadOnly: false,
			accountCapabilities: { [MAIL]: {}, [CONTACTS]: {}, [CALENDARS]: {}, [SIEVE]: {} }
		}
	},
	primaryAccounts: { [MAIL]: ACC, [CONTACTS]: ACC, [CALENDARS]: ACC, [SIEVE]: ACC }
};

const mailboxes = [
	{ id: 'inbox', name: 'Inbox', role: 'inbox', totalEmails: 6, unreadEmails: 2, sortOrder: 0 },
	{ id: 'drafts', name: 'Drafts', role: 'drafts', totalEmails: 0, unreadEmails: 0, sortOrder: 1 },
	{ id: 'sent', name: 'Sent', role: 'sent', totalEmails: 1, unreadEmails: 0, sortOrder: 2 },
	{ id: 'archive', name: 'Archive', role: 'archive', totalEmails: 0, unreadEmails: 0, sortOrder: 3 },
	{ id: 'junk', name: 'Junk', role: 'junk', totalEmails: 1, unreadEmails: 1, sortOrder: 4 },
	{ id: 'trash', name: 'Trash', role: 'trash', totalEmails: 0, unreadEmails: 0, sortOrder: 5 }
];

const now = Date.now();
const at = (hoursAgo) => new Date(now - hoursAgo * 3_600_000).toISOString();
const text = (partId, value) => ({
	textBody: [{ partId, type: 'text/plain' }],
	htmlBody: [],
	bodyValues: { [partId]: { value, isTruncated: false } },
	bodyStructure: { partId, type: 'text/plain' }
});
const html = (partId, value) => ({
	textBody: [],
	htmlBody: [{ partId, type: 'text/html' }],
	bodyValues: { [partId]: { value, isTruncated: false } },
	bodyStructure: { partId, type: 'text/html' }
});
/** Sample mail: every channel, a thread, an attachment, one of each state. */
const emails = new Map(
	[
		{
			id: 'm1', threadId: 't1', mailboxIds: { inbox: true }, keywords: {},
			from: [{ name: 'Stalwart Ops', email: 'ops@zaur.app' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'Re: DKIM rotation for mail.zaur.app', receivedAt: at(1), hasAttachment: true,
			preview: 'The new selector is live. Signing switched over at 09:31 UTC and the first outbound batch verified clean…',
			...text('1', 'The new selector is live on mail.zaur.app. Signing switched over at 09:31 UTC and the first outbound batch verified clean against both Google and Outlook.\n\nThe old key stays published until the 30th so anything still in flight verifies. After that I’ll drop the record and we’re down to one selector again.\n\n— Ops'),
			bodyStructure: {
				type: 'multipart/mixed',
				subParts: [
					{ partId: '1', type: 'text/plain' },
					{ partId: '2', blobId: 'blob-2', type: 'application/pdf', name: 'rotation-plan.pdf', size: 131072, disposition: 'attachment' },
					{ partId: '3', blobId: 'blob-3', type: 'text/plain', name: 'dkim-selector-2026.txt', size: 4096, disposition: 'attachment' }
				]
			}
		},
		{
			id: 'm0', threadId: 't1', mailboxIds: { inbox: true }, keywords: { $seen: true },
			from: [{ name: 'Annie Hobday', email: 'annie@example.com' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'Re: DKIM rotation for mail.zaur.app', receivedAt: at(20), hasAttachment: false,
			preview: 'Works for me — I’ll watch the postmaster reports on Monday afternoon.',
			...text('1', 'Works for me — I’ll watch the postmaster reports on Monday afternoon.')
		},
		{
			id: 'm2', threadId: 't2', mailboxIds: { inbox: true }, keywords: { $important: true },
			from: [{ name: 'Annie Hobday', email: 'annie@example.com' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'Design handoff — reader spacing', receivedAt: at(2.5), hasAttachment: false,
			preview: 'Waiting on your call about the 680px measure before I redraw.',
			...text('1', 'Waiting on your call about the 680px measure before I redraw.')
		},
		{
			id: 'm3', threadId: 't3', mailboxIds: { inbox: true }, keywords: { $seen: true, $flagged: true },
			from: [{ name: 'Marek Lis', email: 'marek@example.org' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'JMAP push quirks on reconnect', receivedAt: at(3), hasAttachment: false,
			preview: 'Kept the thread so you have the history before Thursday.',
			...text('1', 'Kept the thread so you have the history before Thursday.')
		},
		{
			id: 'm4', threadId: 't4', mailboxIds: { inbox: true }, keywords: { $seen: true },
			from: [{ name: 'Dokploy', email: 'deploys@dokploy.example' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'Deployment succeeded — mail2', receivedAt: at(4), hasAttachment: false,
			preview: 'Build 482 pushed to mail2.zaur.app in 2m 14s.',
			...html('1', '<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="color:#1f2937;margin:0 0 8px">Deployment succeeded</h2><p style="color:#374151">Build <strong>482</strong> pushed to <a href="https://mail2.zaur.app">mail2.zaur.app</a> in 2m 14s.</p><table style="border-collapse:collapse;font-size:13px"><tr><td style="padding:4px 12px 4px 0;color:#6b7280">Commit</td><td><code>2030cba</code></td></tr><tr><td style="padding:4px 12px 4px 0;color:#6b7280">Duration</td><td>2m 14s</td></tr></table></div>')
		},
		{
			id: 'm5', threadId: 't5', mailboxIds: { inbox: true }, keywords: { $seen: true },
			from: [{ name: 'GitHub', email: 'noreply@github.example' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'All checks have passed on main', receivedAt: at(30), hasAttachment: false,
			preview: '3 workflows completed successfully for commit 2030cba.',
			...text('1', '3 workflows completed successfully for commit 2030cba.')
		},
		{
			id: 'm6', threadId: 't6', mailboxIds: { sent: true }, keywords: { $seen: true },
			from: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }], to: [{ name: 'Annie Hobday', email: 'annie@example.com' }],
			subject: 'Reader spacing — decision', receivedAt: at(26), hasAttachment: false,
			preview: 'Left-aligned at 680px. Holds up much better than centring.',
			...text('1', 'Left-aligned at 680px. Holds up much better than centring.')
		},
		{
			id: 'm7', threadId: 't7', mailboxIds: { junk: true }, keywords: {},
			from: [{ name: 'Prize Desk', email: 'win@example.net' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'You have been selected', receivedAt: at(5), hasAttachment: false,
			preview: 'Claim within 24 hours.',
			...text('1', 'Claim within 24 hours.')
		}
	].map((email) => [email.id, email])
);

const addressBooks = [
	{ id: 'ab1', name: 'Personal', isDefault: true, isSubscribed: true, myRights: { mayRead: true, mayWrite: true, mayDelete: true } }
];
const cards = new Map([
	[
		'c1',
		{
			id: 'c1',
			addressBookIds: { ab1: true },
			uid: 'urn:uuid:c1',
			kind: 'individual',
			name: { components: [{ kind: 'given', value: 'Ada' }, { kind: 'surname', value: 'Lovelace' }] },
			emails: { e1: { address: 'ada@example.com', contexts: { work: true }, pref: 1 } },
			organizations: { o1: { name: 'Analytical Engines' } },
			updated: '2026-09-01T10:00:00Z'
		}
	],
	[
		'c2',
		{
			id: 'c2',
			addressBookIds: { ab1: true },
			uid: 'urn:uuid:c2',
			name: { components: [{ kind: 'given', value: 'Grace' }, { kind: 'surname', value: 'Hopper' }] },
			emails: { e1: { address: 'grace@example.com' } },
			phones: { p1: { number: '+1 555 0100', features: { mobile: true } } },
			notes: { n1: { note: 'Prefers email.' } }
		}
	],
	[
		'c3',
		{
			id: 'c3',
			addressBookIds: { ab1: true },
			uid: 'urn:uuid:c3',
			organizations: { o1: { name: '42 Ltd' } },
			emails: { e1: { address: 'hello@42.example' } }
		}
	]
]);

const calendars = [
	{ id: 'cal1', name: 'Personal', color: '#2563eb', isDefault: true, isVisible: true, isSubscribed: true, sortOrder: 0, myRights: { mayReadItems: true, mayWriteAll: true, mayWriteOwn: true, mayRSVP: true, mayShare: true, mayDelete: true, mayReadFreeBusy: true, mayUpdatePrivate: true } },
	{ id: 'cal2', name: 'Work', color: '#16a34a', isDefault: false, isVisible: true, isSubscribed: true, sortOrder: 1, myRights: { mayReadItems: true, mayWriteAll: true, mayWriteOwn: true, mayRSVP: true, mayShare: true, mayDelete: true, mayReadFreeBusy: true, mayUpdatePrivate: true } }
];
const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, '0');
const events = new Map([
	['e1', { id: 'e1', uid: 'urn:uuid:e1', calendarIds: { cal1: true }, title: 'Dentist', start: `${y}-${m}-16T09:30:00`, duration: 'PT1H', timeZone: 'Europe/Warsaw', showWithoutTime: false, locations: { l1: { name: 'ul. Długa 5' } } }],
	['e2', { id: 'e2', uid: 'urn:uuid:e2', calendarIds: { cal2: true }, title: 'Sprint planning', start: `${y}-${m}-16T14:00:00`, duration: 'PT2H', timeZone: 'Europe/Warsaw', showWithoutTime: false, description: 'Bring the backlog.', recurrenceRule: { '@type': 'RecurrenceRule', frequency: 'weekly' } }],
	['e3', { id: 'e3', uid: 'urn:uuid:e3', calendarIds: { cal1: true }, title: 'Holiday', start: `${y}-${m}-20T00:00:00`, duration: 'P2D', timeZone: 'Europe/Warsaw', showWithoutTime: true }]
]);

let totpUrl = null;
const appPasswords = new Map([[ 'ap1', { id: 'ap1', description: 'Thunderbird', createdAt: '2026-08-01T00:00:00Z', allowedIps: {} } ]]);
const apiKeys = new Map();

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

// Mail arriving: POST /smoke/deliver adds an unseen inbox message, moves the
// Email state on and tells every open event stream, which is what the push
// watcher listens for. Email/changes answers from this log.
let emailState = 1;
const deliveries = []; // { state, id }
const streams = new Set();
// The refresh token the fake currently honours: rt-0 is what an OAuth smoke session is seeded with.
let refreshGeneration = 0;

function handle([name, args, callId]) {
	const ok = (data) => [name, { accountId: ACC, ...data }, callId];
	const fail = (type, description) => ['error', { type, description }, callId];
	switch (name) {
		case 'Mailbox/get':
			return ok({ state: 'm1', list: args.ids ? mailboxes.filter((mb) => args.ids.includes(mb.id)) : mailboxes, notFound: [] });
		case 'Email/query': {
			const ascending = args.sort?.[0]?.isAscending === true;
			// RFC 8620 §5.5: a filter is a condition or a FilterOperator; a bare
			// `and` key is neither, and a real server rejects it — so does this one.
			const matches = (email, filter) => {
				if (!filter || typeof filter !== 'object') return true;
				if ('and' in filter || 'or' in filter) throw Object.assign(new Error('invalidArguments'), { jmap: 'Unknown filter property' });
				if (filter.operator) {
					const results = (filter.conditions ?? []).map((c) => matches(email, c));
					if (filter.operator === 'AND') return results.every(Boolean);
					if (filter.operator === 'OR') return results.some(Boolean);
					if (filter.operator === 'NOT') return !results.some(Boolean);
				}
				const has = (needle, hay) => String(hay ?? '').toLowerCase().includes(String(needle).toLowerCase());
				const addr = (list) => (list ?? []).map((a) => `${a.name} ${a.email}`).join(' ');
				if (filter.inMailbox && !email.mailboxIds[filter.inMailbox]) return false;
				if (filter.inThread && email.threadId !== filter.inThread) return false;
				if (filter.notKeyword && email.keywords[filter.notKeyword]) return false;
				if (filter.hasKeyword && !email.keywords[filter.hasKeyword]) return false;
				if (filter.hasAttachment !== undefined && !!email.hasAttachment !== filter.hasAttachment) return false;
				if (filter.from && !has(filter.from, addr(email.from))) return false;
				if (filter.to && !has(filter.to, addr(email.to))) return false;
				if (filter.subject && !has(filter.subject, email.subject)) return false;
				if (filter.after && Date.parse(email.receivedAt) < Date.parse(filter.after)) return false;
				if (filter.before && Date.parse(email.receivedAt) > Date.parse(filter.before)) return false;
				if (filter.text && !has(filter.text, `${email.subject} ${email.preview} ${addr(email.from)} ${addr(email.to)}`)) return false;
				return true;
			};
			let list;
			try {
				list = [...emails.values()].filter((e) => matches(e, args.filter));
			} catch (error) {
				log('Email/query rejected filter', JSON.stringify(args.filter));
				return fail('invalidArguments', error.jmap ?? 'Invalid filter');
			}
			list.sort((a, b) => (ascending ? 1 : -1) * (Date.parse(a.receivedAt) - Date.parse(b.receivedAt)));
			const position = args.position ?? 0;
			const ids = list.slice(position, position + (args.limit ?? list.length)).map((e) => e.id);
			return ok({ queryState: 'q1', canCalculateChanges: false, position, ids, total: list.length });
		}
		case 'Email/get': {
			const ids = args.ids ?? [...emails.keys()];
			return ok({ state: `e${emailState}`, list: ids.filter((id) => emails.has(id)).map((id) => emails.get(id)), notFound: ids.filter((id) => !emails.has(id)) });
		}
		case 'Email/changes': {
			const since = Number(String(args.sinceState).slice(1)) || 0;
			const created = deliveries.filter((d) => d.state > since).map((d) => d.id);
			return ok({ oldState: args.sinceState, newState: `e${emailState}`, hasMoreChanges: false, created, updated: [], destroyed: [] });
		}
		case 'Email/set': {
			const updated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				const email = emails.get(id);
				if (!email) continue;
				for (const [k, v] of Object.entries(patch)) {
					if (k.startsWith('keywords/')) {
						const key = k.slice('keywords/'.length);
						if (v) email.keywords[key] = true; else delete email.keywords[key];
					} else if (k.startsWith('mailboxIds/')) {
						const key = k.slice('mailboxIds/'.length);
						if (v) email.mailboxIds[key] = true; else delete email.mailboxIds[key];
					} else if (k === 'keywords' || k === 'mailboxIds') {
						email[k] = { ...v };
					}
				}
				updated[id] = null;
				log('Email updated', id, JSON.stringify(patch));
			}
			const destroyed = [];
			for (const id of args.destroy ?? []) if (emails.delete(id)) destroyed.push(id);
			for (const mb of mailboxes) {
				const inBox = [...emails.values()].filter((e) => e.mailboxIds[mb.id]);
				mb.totalEmails = inBox.length;
				mb.unreadEmails = inBox.filter((e) => !e.keywords.$seen).length;
			}
			return ok({ oldState: 'e1', newState: 'e2', updated, destroyed });
		}
		case 'Identity/get':
			return ok({ state: 'i1', list: [{ id: 'id1', name: 'Smoke Tester', email: 'smoke@zaur.app', mayDelete: false }], notFound: [] });
		case 'Quota/get':
			return ok({ state: 'q', list: [{ id: 'q1', resourceType: 'octets', used: 123456789, hardLimit: 5000000000, scope: 'account', name: 'mail', types: ['Email'] }], notFound: [] });
		case 'SieveScript/get':
			return ok({ state: 's', list: [], notFound: [] });
		case 'AddressBook/get':
			return ok({ state: 'ab', list: addressBooks, notFound: [] });
		case 'ContactCard/query': {
			const ids = [...cards.keys()];
			const position = args.position ?? 0;
			const limit = args.limit ?? ids.length;
			return ok({ queryState: 'cq', canCalculateChanges: false, position, ids: ids.slice(position, position + limit), total: ids.length });
		}
		case 'ContactCard/get': {
			const ids = args.ids ?? [...cards.keys()];
			return ok({ state: 'cs', list: ids.filter((id) => cards.has(id)).map((id) => cards.get(id)), notFound: ids.filter((id) => !cards.has(id)) });
		}
		case 'ContactCard/set': {
			const created = {};
			for (const [key, card] of Object.entries(args.create ?? {})) {
				const id = `c${randomUUID().slice(0, 6)}`;
				cards.set(id, { ...card, id, updated: new Date().toISOString() });
				created[key] = { id, updated: cards.get(id).updated };
				log('ContactCard created', id, JSON.stringify(card).slice(0, 200));
			}
			const updated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				const card = cards.get(id);
				if (!card) continue;
				for (const [k, v] of Object.entries(patch)) {
					if (v === null) delete card[k];
					else card[k] = v;
				}
				card.updated = new Date().toISOString();
				updated[id] = null;
				log('ContactCard updated', id, JSON.stringify(patch).slice(0, 200));
			}
			const destroyed = [];
			for (const id of args.destroy ?? []) if (cards.delete(id)) destroyed.push(id);
			return ok({ oldState: 'cs', newState: 'cs2', created, updated, destroyed });
		}
		case 'Calendar/get':
			return ok({ state: 'cal', list: calendars, notFound: [] });
		case 'Calendar/set': {
			const updated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				const cal = calendars.find((c) => c.id === id);
				if (cal) { Object.assign(cal, patch); updated[id] = null; }
			}
			const created = {};
			for (const [key, cal] of Object.entries(args.create ?? {})) {
				const id = `cal${randomUUID().slice(0, 4)}`;
				calendars.push({ id, isVisible: true, isSubscribed: true, myRights: calendars[0].myRights, color: '#7c3aed', ...cal });
				created[key] = { id };
			}
			return ok({ oldState: 'cal', newState: 'cal2', created, updated, destroyed: [] });
		}
		case 'CalendarEvent/query': {
			// No real expansion: hand back every event; the client filters by day anyway.
			const list = [...events.values()];
			const ids = list.map((e) => e.id);
			if (args.expandRecurrences) {
				// Fake one extra occurrence a week later for the weekly event.
				for (const e of list) if (e.recurrenceRule) ids.push(`${e.id};${e.start.slice(0, 10)}+7`);
			}
			return ok({ queryState: 'eq', canCalculateChanges: false, position: 0, ids, total: ids.length });
		}
		case 'CalendarEvent/get': {
			const ids = args.ids ?? [...events.keys()];
			const list = [];
			for (const id of ids) {
				if (events.has(id)) { list.push(events.get(id)); continue; }
				const [base] = id.split(';');
				const master = events.get(base);
				if (master) {
					const d = new Date(master.start);
					d.setDate(d.getDate() + 7);
					const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${master.start.slice(11)}`;
					list.push({ ...master, id, baseEventId: base, recurrenceId: start, start });
				}
			}
			return ok({ state: 'es', list, notFound: [] });
		}
		case 'CalendarEvent/set': {
			const created = {};
			for (const [key, ev] of Object.entries(args.create ?? {})) {
				const id = `e${randomUUID().slice(0, 6)}`;
				events.set(id, { ...ev, id });
				created[key] = { id };
				log('CalendarEvent created', id, JSON.stringify(ev).slice(0, 220));
			}
			const updated = {};
			const notUpdated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				if (!events.has(id)) { notUpdated[id] = { type: 'notFound', description: 'synthetic ids cannot be updated by this fake' }; continue; }
				const ev = events.get(id);
				for (const [k, v] of Object.entries(patch)) {
					if (k === 'calendarIds') { ev.calendarIds = Object.fromEntries(Object.entries(v).filter(([, on]) => on)); continue; }
					if (v === null) delete ev[k]; else ev[k] = v;
				}
				updated[id] = null;
				log('CalendarEvent updated', id, JSON.stringify(patch).slice(0, 220));
			}
			const destroyed = [];
			for (const id of args.destroy ?? []) if (events.delete(id)) destroyed.push(id);
			return ok({ oldState: 'es', newState: 'es2', created, updated, notUpdated, destroyed });
		}
		case 'x:AccountPassword/get':
			return ok({ state: 'p', list: [{ id: 'singleton', secret: '********', otpAuth: { otpUrl: totpUrl ? '********' : null, otpCode: null } }], notFound: [] });
		case 'x:AccountPassword/set': {
			const patch = args.update?.singleton ?? {};
			log('AccountPassword/set', JSON.stringify({ ...patch, currentSecret: patch.currentSecret ? '<redacted>' : undefined, secret: patch.secret ? '<redacted>' : undefined }));
			if (patch.currentSecret !== 'not-a-real-password') {
				return ok({ notUpdated: { singleton: { type: 'forbidden', description: 'Current password is incorrect' } } });
			}
			if ('otpAuth/otpUrl' in patch) totpUrl = patch['otpAuth/otpUrl'];
			return ok({ updated: { singleton: null } });
		}
		case 'x:AppPassword/query':
			return ok({ ids: [...appPasswords.keys()] });
		case 'x:AppPassword/get':
			return ok({ list: (args.ids ?? [...appPasswords.keys()]).map((id) => appPasswords.get(id)).filter(Boolean), notFound: [] });
		case 'x:AppPassword/set':
		case 'x:ApiKey/set': {
			const store = name.startsWith('x:AppPassword') ? appPasswords : apiKeys;
			const prefix = name.startsWith('x:AppPassword') ? 'app_' : 'API_';
			const created = {};
			for (const [key, rec] of Object.entries(args.create ?? {})) {
				const id = `${prefix}${randomUUID().slice(0, 6)}`;
				store.set(id, { id, description: rec.description, createdAt: new Date().toISOString(), expiresAt: rec.expiresAt ?? null, allowedIps: rec.allowedIps ?? {} });
				created[key] = { id, secret: `${prefix}${randomUUID().replaceAll('-', '')}` };
				log(name, 'created', JSON.stringify(rec));
			}
			const destroyed = [];
			for (const id of args.destroy ?? []) if (store.delete(id)) destroyed.push(id);
			return ok({ created, updated: {}, destroyed });
		}
		case 'x:ApiKey/query':
			return ok({ ids: [...apiKeys.keys()] });
		case 'x:ApiKey/get':
			return ok({ list: (args.ids ?? [...apiKeys.keys()]).map((id) => apiKeys.get(id)).filter(Boolean), notFound: [] });
		default:
			log('unknown method', name);
			return fail('unknownMethod', `${name} is not implemented by the fake`);
	}
}

/** Resolve `#ids` back-references against earlier responses in the same request. */
function resolveRefs(args, responses) {
	const out = { ...args };
	for (const [key, value] of Object.entries(args)) {
		if (!key.startsWith('#')) continue;
		const ref = value;
		const source = responses.find((r) => r[2] === ref.resultOf && r[0] === ref.name);
		delete out[key];
		out[key.slice(1)] = source ? source[1][ref.path.replace('/', '')] ?? [] : [];
	}
	return out;
}

http
	.createServer((req, res) => {
		// OAuth, just enough for server-auth's token refresh: discovery plus a token
		// endpoint that ROTATES refresh tokens and refuses a used one, like a strict
		// server would. A refreshed token that never gets saved shows up as invalid_grant.
		if (req.method === 'GET' && req.url === '/.well-known/oauth-authorization-server') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			return res.end(JSON.stringify({
				issuer: BASE, authorization_endpoint: `${BASE}/authorize`, token_endpoint: `${BASE}/token`,
				code_challenge_methods_supported: ['S256'], scopes_supported: ['offline_access', 'urn:ietf:params:oauth:scope:mail']
			}));
		}
		if (req.method === 'POST' && req.url === '/token') {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => {
				const form = new URLSearchParams(body);
				const presented = form.get('refresh_token');
				if (form.get('grant_type') !== 'refresh_token' || presented !== `rt-${refreshGeneration}`) {
					log('token refresh REFUSED', presented, `(current rt-${refreshGeneration})`);
					res.writeHead(400, { 'Content-Type': 'application/json' });
					return res.end(JSON.stringify({ error: 'invalid_grant' }));
				}
				refreshGeneration += 1;
				log('token refresh', presented, '→', `rt-${refreshGeneration}`);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ access_token: `at-${refreshGeneration}`, refresh_token: `rt-${refreshGeneration}`, token_type: 'Bearer', expires_in: 60, scope: 'offline_access urn:ietf:params:oauth:scope:mail' }));
			});
			return;
		}
		if (req.method === 'POST' && req.url === '/smoke/deliver') {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => {
				const input = body ? JSON.parse(body) : {};
				const id = `m-${randomUUID().slice(0, 8)}`;
				emails.set(id, {
					id, threadId: `t-${id}`, mailboxIds: { inbox: true }, keywords: {},
					from: [{ name: input.fromName ?? 'Ada Lovelace', email: input.from ?? 'ada@example.com' }],
					to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
					subject: input.subject ?? 'Notes on the engine', receivedAt: new Date().toISOString(), hasAttachment: false,
					preview: 'Fresh off the fake wire.', ...text('1', 'Fresh off the fake wire.')
				});
				emailState += 1;
				deliveries.push({ state: emailState, id });
				const inbox = mailboxes.find((mb) => mb.id === 'inbox');
				inbox.totalEmails += 1;
				inbox.unreadEmails += 1;
				const change = JSON.stringify({ '@type': 'StateChange', changed: { [ACC]: { Email: `e${emailState}`, Mailbox: `m${emailState}` } } });
				for (const stream of streams) stream.write(`event: state\ndata: ${change}\n\n`);
				log('delivered', id, `→ ${streams.size} event stream(s)`);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ id, threadId: `t-${id}`, state: `e${emailState}` }));
			});
			return;
		}
		if (!req.headers.authorization) {
			res.writeHead(401, { 'WWW-Authenticate': 'Basic' });
			return res.end('auth required');
		}
		if (req.method === 'GET' && (req.url === '/.well-known/jmap' || req.url === '/jmap/session')) {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			return res.end(JSON.stringify(session));
		}
		if (req.method === 'GET' && req.url.startsWith('/jmap/eventsource')) {
			res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
			res.write('event: ping\ndata: {"interval":30}\n\n');
			const timer = setInterval(() => res.write('event: ping\ndata: {"interval":30}\n\n'), 25000);
			streams.add(res);
			req.on('close', () => {
				clearInterval(timer);
				streams.delete(res);
			});
			return;
		}
		if (req.method === 'POST' && req.url === '/jmap') {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => {
				const request = JSON.parse(body);
				const responses = [];
				for (const call of request.methodCalls) {
					const [name, args, callId] = call;
					responses.push(handle([name, resolveRefs(args, responses), callId]));
				}
				log(request.methodCalls.map((c) => c[0]).join(', '), '→', responses.map((r) => r[0]).join(', '));
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ methodResponses: responses, sessionState: 's1' }));
			});
			return;
		}
		res.writeHead(404);
		res.end('not found');
	})
	.listen(PORT, '127.0.0.1', () => log(`fake JMAP listening on ${BASE}`));
