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
	{ id: 'inbox', name: 'Inbox', role: 'inbox', totalEmails: 0, unreadEmails: 0, sortOrder: 0 },
	{ id: 'drafts', name: 'Drafts', role: 'drafts', totalEmails: 0, unreadEmails: 0, sortOrder: 1 },
	{ id: 'sent', name: 'Sent', role: 'sent', totalEmails: 0, unreadEmails: 0, sortOrder: 2 },
	{ id: 'trash', name: 'Trash', role: 'trash', totalEmails: 0, unreadEmails: 0, sortOrder: 3 }
];

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

function handle([name, args, callId]) {
	const ok = (data) => [name, { accountId: ACC, ...data }, callId];
	const fail = (type, description) => ['error', { type, description }, callId];
	switch (name) {
		case 'Mailbox/get':
			return ok({ state: 'm1', list: args.ids ? mailboxes.filter((mb) => args.ids.includes(mb.id)) : mailboxes, notFound: [] });
		case 'Email/query':
			return ok({ queryState: 'q1', canCalculateChanges: false, position: 0, ids: [], total: 0 });
		case 'Email/get':
			return ok({ state: 'e1', list: [], notFound: [] });
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
			req.on('close', () => clearInterval(timer));
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
