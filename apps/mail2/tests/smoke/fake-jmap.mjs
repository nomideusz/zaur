// A tiny in-memory JMAP server speaking just enough of Stalwart's dialect to
// exercise mail2's remote functions end to end: session, mailboxes, contacts
// (RFC 9610), calendars, and the urn:stalwart:jmap self-service objects.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import zlib from 'node:zlib';

const PORT = 9911;
const BASE = `http://127.0.0.1:${PORT}`;
const ACC = 'acc1';
const CORE = 'urn:ietf:params:jmap:core';
const MAIL = 'urn:ietf:params:jmap:mail';
const CONTACTS = 'urn:ietf:params:jmap:contacts';
const CALENDARS = 'urn:ietf:params:jmap:calendars';
const SIEVE = 'urn:ietf:params:jmap:sieve';
const VACATION = 'urn:ietf:params:jmap:vacationresponse';
const FILENODE = 'urn:ietf:params:jmap:filenode';
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
		[VACATION]: {},
		[FILENODE]: {},
		[STALWART]: {}
	},
	accounts: {
		[ACC]: {
			name: 'smoke@zaur.app',
			isPersonal: true,
			isReadOnly: false,
			accountCapabilities: { [MAIL]: {}, [CONTACTS]: {}, [CALENDARS]: {}, [SIEVE]: {}, [VACATION]: {}, [FILENODE]: {} }
		}
	},
	primaryAccounts: { [MAIL]: ACC, [CONTACTS]: ACC, [CALENDARS]: ACC, [SIEVE]: ACC, [FILENODE]: ACC }
};

const mailboxes = [
	{ id: 'inbox', name: 'Inbox', role: 'inbox', totalEmails: 7, unreadEmails: 3, sortOrder: 0 },
	{ id: 'drafts', name: 'Drafts', role: 'drafts', totalEmails: 0, unreadEmails: 0, sortOrder: 1 },
	{ id: 'sent', name: 'Sent', role: 'sent', totalEmails: 1, unreadEmails: 0, sortOrder: 2 },
	{ id: 'archive', name: 'Archive', role: 'archive', totalEmails: 1, unreadEmails: 0, sortOrder: 3 },
	{ id: 'junk', name: 'Junk', role: 'junk', totalEmails: 1, unreadEmails: 1, sortOrder: 4 },
	{ id: 'trash', name: 'Trash', role: 'trash', totalEmails: 0, unreadEmails: 0, sortOrder: 5 },
	{ id: 'scheduled', name: 'Scheduled', role: 'scheduled', totalEmails: 1, unreadEmails: 0, sortOrder: 6 },
	{ id: 'work', name: 'Work', role: null, parentId: null, totalEmails: 0, unreadEmails: 0, sortOrder: 10 },
	{ id: 'receipts', name: 'Receipts', role: null, parentId: 'work', totalEmails: 0, unreadEmails: 0, sortOrder: 10 }
];
// An alias, so compose has a From to choose; Identity/set keeps names and signatures.
const identities = [
	{ id: 'id1', name: 'Smoke Tester', email: 'smoke@zaur.app', mayDelete: false, textSignature: 'Smoke Tester\nzaur.app' },
	{ id: 'id2', name: 'Smoke Help', email: 'help@zaur.app', mayDelete: true, textSignature: '' }
];
let vacationResponse = { id: 'singleton', isEnabled: false, fromDate: null, toDate: null, subject: null, textBody: null, htmlBody: null };

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
// Attachment bytes, made here so the preview has real files to open.
function makePdf(titles) {
	const objs = [, '<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${titles.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${titles.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
	titles.forEach((title, i) => {
		const stream = `BT /F1 28 Tf 72 700 Td (${title}) Tj ET BT /F1 12 Tf 72 660 Td (A PDF made by the smoke server, page ${i + 1} of ${titles.length}.) Tj ET`;
		objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
		objs[5 + i * 2] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
	});
	let out = '%PDF-1.4\n';
	const offsets = [];
	for (let n = 1; n < objs.length; n++) {
		offsets.push(out.length);
		out += `${n} 0 obj\n${objs[n]}\nendobj\n`;
	}
	const xref = out.length;
	out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
	out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(out, 'latin1');
}
function makePng(w, h) {
	const raw = Buffer.alloc((w * 3 + 1) * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * (w * 3 + 1) + 1 + x * 3;
			raw[i] = 40 + Math.round((180 * x) / w);
			raw[i + 1] = 90 + Math.round((120 * y) / h);
			raw[i + 2] = 200;
		}
	}
	const chunk = (type, data) => {
		const body = Buffer.concat([Buffer.from(type), data]);
		const head = Buffer.alloc(4);
		head.writeUInt32BE(data.length);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(zlib.crc32(body));
		return Buffer.concat([head, body, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function makeWav(seconds = 1.5, rate = 8000) {
	const n = Math.floor(seconds * rate);
	const data = Buffer.alloc(n * 2);
	for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000 * (1 - i / n)), i * 2);
	const head = Buffer.alloc(44);
	head.write('RIFF', 0);
	head.writeUInt32LE(36 + data.length, 4);
	head.write('WAVEfmt ', 8);
	head.writeUInt32LE(16, 16);
	head.writeUInt16LE(1, 20);
	head.writeUInt16LE(1, 22);
	head.writeUInt32LE(rate, 24);
	head.writeUInt32LE(rate * 2, 28);
	head.writeUInt16LE(2, 32);
	head.writeUInt16LE(16, 34);
	head.write('data', 36);
	head.writeUInt32LE(data.length, 40);
	return Buffer.concat([head, data]);
}
const blobs = {
	'blob-logo': ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="36"><rect width="120" height="36" rx="8" fill="#2563eb"/><text x="60" y="24" font-family="monospace" font-size="16" fill="#fff" text-anchor="middle">ZA/UR</text></svg>'],
	'blob-2': ['application/pdf', makePdf(['Rotation plan', 'Timeline', 'Rollback'])],
	'blob-3': ['text/plain', 'selector: zaur2026\nalgorithm: rsa-sha256\nkey-length: 2048\n\np=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA…\n'],
	'blob-photo': ['image/png', makePng(960, 640)],
	'blob-voice': ['audio/wav', makeWav()]
};

/** File storage: two folders (one nested), files at the top and inside. */
const fileNode = (id, parentId, name, blobId = null) => ({
	id, parentId, name, nodeType: blobId ? 'file' : 'directory', blobId,
	type: blobId ? blobs[blobId][0] : null, size: blobId ? blobs[blobId][1].length : null,
	created: '2026-09-01T09:00:00Z', modified: '2026-09-20T15:30:00Z', role: null,
	myRights: { mayRead: true, mayAddChildren: true, mayRename: true, mayDelete: true, mayModifyContent: true, mayShare: true }
});
const fileNodes = [
	fileNode('fn-docs', null, 'Documents'),
	fileNode('fn-work', null, 'Work'),
	fileNode('fn-contracts', 'fn-work', 'Contracts'),
	fileNode('fn-plan', null, 'rotation-plan.pdf', 'blob-2'),
	fileNode('fn-logo', null, 'logo.svg', 'blob-logo'),
	fileNode('fn-dkim', 'fn-docs', 'dkim.txt', 'blob-3'),
	fileNode('fn-photo', 'fn-contracts', 'studio.png', 'blob-photo')
];

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
		},
		{
			// A remote image (blocked until asked for) and an inline cid: one (always shown).
			id: 'm8', threadId: 't8', mailboxIds: { inbox: true }, keywords: {},
			from: [{ name: 'Newsletter', email: 'news@example.com' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: 'This week at the studio', receivedAt: at(0.5), hasAttachment: true,
			preview: 'Our logo, and a picture from somewhere else.',
			...html('1', '<p>Our logo, sent with the message:</p><p><img src="cid:logo@zaur" alt="Studio logo"></p><p>And a picture from somewhere else:</p><p><img src="https://example.com/pixel.png" alt="Remote picture" width="120" height="40"></p>'),
			bodyStructure: {
				type: 'multipart/mixed',
				subParts: [
					{
						type: 'multipart/related',
						subParts: [
							{ partId: '1', type: 'text/html' },
							{ partId: '2', blobId: 'blob-logo', type: 'image/svg+xml', name: 'logo.svg', cid: '<logo@zaur>', disposition: 'inline', size: 200 }
						]
					},
					{ partId: '3', blobId: 'blob-photo', type: 'image/png', name: 'studio.png', size: blobs['blob-photo'][1].length, disposition: 'attachment' },
					{ partId: '4', blobId: 'blob-voice', type: 'audio/wav', name: 'voice-note.wav', size: blobs['blob-voice'][1].length, disposition: 'attachment' }
				]
			}
		},
		{
			// Webmail 1.0's settings carrier: never shown as mail.
			id: 'm9', threadId: 't9', mailboxIds: { archive: true }, keywords: { $seen: true },
			from: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }], to: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }],
			subject: '__zaur_webmail_settings_v1__', receivedAt: at(40), hasAttachment: false,
			preview: '{}', ...text('1', '{}')
		},
		{
			// Sent already (its submission is final), still in Scheduled until a client files it.
			id: 'm10', threadId: 't10', mailboxIds: { scheduled: true }, keywords: { $seen: true },
			from: [{ name: 'Smoke Tester', email: 'smoke@zaur.app' }], to: [{ name: 'Annie Hobday', email: 'annie@example.com' }],
			subject: 'Weekly notes', receivedAt: at(6), hasAttachment: false,
			preview: 'Went out this morning.', ...text('1', 'Went out this morning.')
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
	{ id: 'cal2', name: 'Work', color: '#16a34a', isDefault: false, isVisible: true, isSubscribed: true, sortOrder: 1, shareWith: { 'principal-anna': { mayReadItems: true, mayWriteAll: false, mayWriteOwn: false, mayRSVP: true, mayShare: false, mayDelete: false, mayReadFreeBusy: true, mayUpdatePrivate: false } }, myRights: { mayReadItems: true, mayWriteAll: true, mayWriteOwn: true, mayRSVP: true, mayShare: true, mayDelete: true, mayReadFreeBusy: true, mayUpdatePrivate: true } },
	{ id: 'cal3', name: 'PL Holidays', color: '#d97706', isDefault: false, isVisible: true, isSubscribed: true, sortOrder: 2, myRights: { mayReadItems: true, mayWriteAll: false, mayWriteOwn: false, mayRSVP: false, mayShare: false, mayDelete: false, mayReadFreeBusy: true, mayUpdatePrivate: false } }
];
const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, '0');
/** Anchored to today, so the day and week views always have something in them. */
const slot = (offsetDays, hours, minutes = 0) => {
	const when = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays, hours, minutes);
	return `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}T${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}:00`;
};
const events = new Map([
	['e1', { id: 'e1', uid: 'urn:uuid:e1', calendarIds: { cal1: true }, title: 'Dentist', start: `${y}-${m}-16T09:30:00`, duration: 'PT1H', timeZone: 'Europe/Warsaw', showWithoutTime: false, locations: { l1: { name: 'ul. Długa 5' } } }],
	['e2', { id: 'e2', uid: 'urn:uuid:e2', calendarIds: { cal2: true }, title: 'Sprint planning', start: `${y}-${m}-16T14:00:00`, duration: 'PT2H', timeZone: 'Europe/Warsaw', showWithoutTime: false, description: 'Bring the backlog.', recurrenceRule: { '@type': 'RecurrenceRule', frequency: 'weekly' } }],
	['e3', { id: 'e3', uid: 'urn:uuid:e3', calendarIds: { cal1: true }, title: 'Holiday', start: `${y}-${m}-20T00:00:00`, duration: 'P2D', timeZone: 'Europe/Warsaw', showWithoutTime: true }],
	// Three that overlap, so the time grid has lanes to share out.
	['e4', { id: 'e4', uid: 'urn:uuid:e4', calendarIds: { cal2: true }, title: 'Design review', start: slot(0, 10, 0), duration: 'PT1H30M', timeZone: 'Europe/Warsaw', showWithoutTime: false }],
	['e5', { id: 'e5', uid: 'urn:uuid:e5', calendarIds: { cal1: true }, title: 'Call with Anna', start: slot(0, 10, 30), duration: 'PT1H', timeZone: 'Europe/Warsaw', showWithoutTime: false, locations: { l1: { name: 'Meet' } } }],
	['e6', { id: 'e6', uid: 'urn:uuid:e6', calendarIds: { cal2: true }, title: 'Standup', start: slot(0, 9, 0), duration: 'PT15M', timeZone: 'Europe/Warsaw', showWithoutTime: false }],
	['e7', { id: 'e7', uid: 'urn:uuid:e7', calendarIds: { cal1: true }, title: 'Pick up the kids', start: slot(1, 15, 30), duration: 'PT45M', timeZone: 'Europe/Warsaw', showWithoutTime: false }],
	['e8', { id: 'e8', uid: 'urn:uuid:e8', calendarIds: { cal2: true }, title: 'Deploy window', start: slot(-1, 22, 0), duration: 'PT5H', timeZone: 'Europe/Warsaw', showWithoutTime: false }],
	['e9', { id: 'e9', uid: 'urn:uuid:e9', calendarIds: { cal3: true }, title: 'Independence Day', start: slot(2, 0, 0), duration: 'P1D', timeZone: 'Europe/Warsaw', showWithoutTime: true }]
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
		case 'Mailbox/set': {
			const created = {};
			for (const [key, data] of Object.entries(args.create ?? {})) {
				const id = `mb-${randomUUID().slice(0, 6)}`;
				mailboxes.push({ id, name: data.name, role: null, parentId: data.parentId ?? null, totalEmails: 0, unreadEmails: 0, sortOrder: 10 });
				created[key] = { id };
				log('Mailbox created', id, JSON.stringify(data));
			}
			const updated = {};
			const notUpdated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				const mb = mailboxes.find((m) => m.id === id);
				if (!mb) { notUpdated[id] = { type: 'notFound' }; continue; }
				Object.assign(mb, patch);
				updated[id] = null;
				log('Mailbox updated', id, JSON.stringify(patch));
			}
			const destroyed = [];
			const notDestroyed = {};
			for (const id of args.destroy ?? []) {
				if (mailboxes.some((m) => m.parentId === id)) { notDestroyed[id] = { type: 'mailboxHasChild' }; continue; }
				const at = mailboxes.findIndex((m) => m.id === id);
				if (at === -1) continue;
				mailboxes.splice(at, 1);
				destroyed.push(id);
				log('Mailbox destroyed', id, `onDestroyRemoveEmails=${args.onDestroyRemoveEmails}`);
			}
			return ok({ oldState: 'm1', newState: 'm2', created, updated, notUpdated, destroyed, notDestroyed });
		}
		case 'FileNode/query': {
			const f = args.filter ?? {};
			const ids = fileNodes
				.filter((n) => (f.isTopLevel ? n.parentId === null : true))
				.filter((n) => ('parentId' in f ? n.parentId === f.parentId : true))
				.filter((n) => (f.nodeType ? n.nodeType === f.nodeType : true))
				.map((n) => n.id);
			return ok({ queryState: 'f1', ids, position: 0 });
		}
		case 'FileNode/get': {
			const want = new Set(args.ids ?? fileNodes.map((n) => n.id));
			if (args.fetchParents) {
				for (const id of [...want]) {
					for (let n = fileNodes.find((x) => x.id === id); n?.parentId; n = fileNodes.find((x) => x.id === n.parentId)) want.add(n.parentId);
				}
			}
			const list = fileNodes.filter((n) => want.has(n.id));
			return ok({ state: 'f1', list, notFound: [...want].filter((id) => !list.some((n) => n.id === id)) });
		}
		case 'FileNode/set': {
			const clash = (parentId, name, self) => fileNodes.some((n) => n.parentId === parentId && n.name === name && n.id !== self);
			const created = {};
			const notCreated = {};
			for (const [key, data] of Object.entries(args.create ?? {})) {
				if (clash(data.parentId ?? null, data.name)) { notCreated[key] = { type: 'alreadyExists', description: `“${data.name}” is already here` }; continue; }
				const node = { ...fileNode(`fn-${randomUUID().slice(0, 6)}`, data.parentId ?? null, data.name), nodeType: data.nodeType, blobId: data.blobId ?? null, type: data.type ?? null, size: data.blobId ? blobs[data.blobId]?.[1].length ?? 0 : null, modified: new Date().toISOString() };
				fileNodes.push(node);
				created[key] = { id: node.id };
				log('FileNode created', node.id, JSON.stringify(data));
			}
			const updated = {};
			const notUpdated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				const node = fileNodes.find((n) => n.id === id);
				if (!node) { notUpdated[id] = { type: 'notFound' }; continue; }
				if (clash(patch.parentId === undefined ? node.parentId : patch.parentId, patch.name ?? node.name, id)) { notUpdated[id] = { type: 'alreadyExists', description: 'Something by that name is already there' }; continue; }
				Object.assign(node, patch, { modified: new Date().toISOString() });
				updated[id] = null;
				log('FileNode updated', id, JSON.stringify(patch));
			}
			const destroyed = [];
			const notDestroyed = {};
			const drop = (id) => {
				for (const child of fileNodes.filter((n) => n.parentId === id)) drop(child.id);
				fileNodes.splice(fileNodes.findIndex((n) => n.id === id), 1);
			};
			for (const id of args.destroy ?? []) {
				if (!args.onDestroyRemoveChildren && fileNodes.some((n) => n.parentId === id)) { notDestroyed[id] = { type: 'nodeHasChildren' }; continue; }
				drop(id);
				destroyed.push(id);
				log('FileNode destroyed', id, `onDestroyRemoveChildren=${args.onDestroyRemoveChildren}`);
			}
			return ok({ oldState: 'f1', newState: 'f2', created, notCreated, updated, notUpdated, destroyed, notDestroyed });
		}
		case 'VacationResponse/get':
			return ok({ state: 'v1', list: [vacationResponse], notFound: [] });
		case 'VacationResponse/set':
			vacationResponse = { ...vacationResponse, ...(args.update?.singleton ?? {}) };
			log('VacationResponse set', JSON.stringify(vacationResponse));
			return ok({ oldState: 'v1', newState: 'v2', updated: { singleton: null } });
		case 'Identity/set': {
			const updated = {};
			for (const [id, patch] of Object.entries(args.update ?? {})) {
				const identity = identities.find((i) => i.id === id);
				if (!identity) continue;
				Object.assign(identity, patch);
				updated[id] = null;
				log('Identity updated', id, JSON.stringify(patch));
			}
			return ok({ oldState: 'i1', newState: 'i2', updated });
		}
		case 'EmailSubmission/set': {
			const created = {};
			for (const [key, sub] of Object.entries(args.create ?? {})) {
				const email = emails.get(sub.emailId);
				log('EmailSubmission created', JSON.stringify({ identityId: sub.identityId, from: email?.from, subject: email?.subject, body: email && Object.values(email.bodyValues ?? {})[0]?.value }));
				created[key] = { id: `sub-${sub.emailId}` };
				const patch = args.onSuccessUpdateEmail?.[`#${key}`];
				if (email && patch?.mailboxIds) email.mailboxIds = { ...patch.mailboxIds };
			}
			return ok({ oldState: 'sub1', newState: 'sub2', created });
		}
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
			const createdEmails = {};
			for (const [key, data] of Object.entries(args.create ?? {})) {
				const id = `out-${randomUUID().slice(0, 6)}`;
				emails.set(id, { threadId: id, keywords: {}, receivedAt: new Date().toISOString(), preview: '', to: [], cc: [], ...data, id });
				createdEmails[key] = { id, blobId: id, threadId: id, size: 1 };
				log('Email created', id, JSON.stringify({ from: data.from, subject: data.subject }));
			}
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
			return ok({ oldState: 'e1', newState: 'e2', created: createdEmails, updated, destroyed });
		}
		case 'EmailSubmission/query': {
			const wanted = args.filter?.emailIds ?? [];
			return ok({ queryState: 'sq1', ids: wanted.filter((id) => emails.get(id)?.mailboxIds.scheduled).map((id) => `sub-${id}`) });
		}
		case 'EmailSubmission/get':
			return ok({ state: 'sub1', list: (args.ids ?? []).map((id) => ({ id, emailId: id.slice(4), undoStatus: 'final' })), notFound: [] });
		case 'Identity/get':
			return ok({ state: 'i1', list: identities, notFound: [] });
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
		// Register's password-reset API (REGISTER_API_URL=http://127.0.0.1:9911):
		// the one good token is `smoke-token`, and the reset logs the request.
		if (req.url.startsWith('/api/forgot-password/')) {
			const route = new URL(req.url, BASE);
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => {
				const input = req.method === 'GET' ? Object.fromEntries(route.searchParams) : JSON.parse(body || '{}');
				const valid = input.token === 'smoke-token';
				const answer = route.pathname.endsWith('/request')
					? [200, { ok: true, message: 'If an account exists for that address, we sent reset instructions to its recovery email.' }]
					: !valid
						? [400, { valid: false, error: 'This reset link is invalid or has expired.' }]
						: route.pathname.endsWith('/verify')
							? [200, { valid: true, mailboxEmail: input.email }]
							: [200, { success: true, mailboxEmail: input.email }];
				log('register', route.pathname, input.email, req.headers['x-zaur-client-ip'] ?? '(no client ip)');
				res.writeHead(answer[0], { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(answer[1]));
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
		if (req.method === 'GET' && req.url.startsWith('/jmap/download/')) {
			const blob = blobs[decodeURIComponent(req.url.split('/')[4] ?? '')];
			if (!blob) {
				res.writeHead(404);
				return res.end('no such blob');
			}
			res.writeHead(200, { 'Content-Type': blob[0] });
			return res.end(blob[1]);
		}
		if (req.method === 'POST' && req.url.startsWith('/jmap/upload/')) {
			const chunks = [];
			req.on('data', (chunk) => chunks.push(chunk));
			req.on('end', () => {
				const blobId = `blob-up-${randomUUID().slice(0, 6)}`;
				const type = req.headers['content-type'] ?? 'application/octet-stream';
				blobs[blobId] = [type, Buffer.concat(chunks)];
				log('uploaded', blobId, type, blobs[blobId][1].length, 'bytes');
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ accountId: ACC, blobId, type, size: blobs[blobId][1].length }));
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
