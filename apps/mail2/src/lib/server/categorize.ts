/**
 * Background categorisation of mail no rule caught, with TypeSafe's Jev.
 *
 * Off unless the server has `TYPESAFE_API_KEY` **and** the account turned it on
 * in Settings: it sends sender, subject, the bulk-mail headers and the first
 * couple of kilobytes of body to a third party. The result is written as a
 * `cat.<id>` keyword, so it is stored once, rules made at delivery always win
 * (a categorised message is never looked at again), and the list refreshes on
 * its own through the Email state change.
 */
import { CATEGORIES, CATEGORY_OTHER, categoryKeyword, categoryOf } from '@zaur/mail-core';
import type { JMAPClient, JMAPEmail } from '@zaur/mail-core';
import { getAccountPrefs, getStoreDb } from '@zaur/server-auth';
import { AI_CONFIDENCE_FLOOR, parsePrefs } from '#lib/settings';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MAX_PER_LIST = 25;
/** Enough body to tell a receipt from a shipping notice; with the rest, ~600 Jev tokens a message. */
const BODY_BYTES = 2000;
/** After a failed call, hold off: every list load would otherwise re-fire the same batch. */
const PAUSE_MS = 60_000;
/**
 * The headers that mark bulk and automated mail (RFC 2919, RFC 8058, RFC 3834).
 * Cheap to fetch and the strongest signal there is for newsletters and
 * notifications, so the model sees them by name.
 */
const BULK_HEADERS = ['List-Id', 'List-Unsubscribe', 'Precedence', 'Auto-Submitted'] as const;
const CLASSIFY_PROPERTIES = [
	'id',
	'keywords',
	'mailboxIds',
	'from',
	'subject',
	'preview',
	'textBody',
	'bodyValues',
	...BULK_HEADERS.map((name) => `header:${name}:asText`)
];

export const aiCategoriesAvailable = () => !!process.env.TYPESAFE_API_KEY;

/** What the account asked for in Settings → Rules & categories. */
export interface AiSettings {
	on: boolean;
	/** Choice confidence below which the answer is Other. */
	floor: number;
	/** Sender, subject and list headers only — no text leaves the server. */
	headersOnly: boolean;
	/** Newsletters the AI finds in the inbox go to Archive. */
	archiveNewsletters: boolean;
}

/** The account's own settings; the list query, the push watcher and the re-check all ask. */
export function aiSettings(accountKey: string): AiSettings {
	try {
		const prefs = parsePrefs(getAccountPrefs(getStoreDb(), accountKey));
		return {
			on: prefs.aiCategories,
			floor: AI_CONFIDENCE_FLOOR[prefs.aiConfidence],
			headersOnly: prefs.aiHeadersOnly,
			archiveNewsletters: prefs.aiArchiveNewsletters
		};
	} catch {
		return { on: false, floor: 1, headersOnly: true, archiveNewsletters: false };
	}
}

// ponytail: in-flight set per process; a second server instance may classify the same message twice, harmless.
const inFlight = new Set<string>();
let pausedUntil = 0;

/**
 * Classify what has no category yet, up to a batch, and write the keywords.
 * With `recheck`, take the messages the model once gave up on (`cat.other`)
 * instead — for when the criteria got better, since "other" is otherwise final.
 */
export function categorizeInBackground(
	client: JMAPClient,
	emails: Pick<JMAPEmail, 'id' | 'keywords'>[],
	opts: { ai: AiSettings; recheck?: boolean; limit?: number }
): number {
	if (!aiCategoriesAvailable() || !opts.ai.on || Date.now() < pausedUntil) return 0;
	const account = client.getAccountId();
	const wanted = (email: Pick<JMAPEmail, 'keywords'>) =>
		opts.recheck ? categoryOf(email.keywords) === CATEGORY_OTHER : !categoryOf(email.keywords);
	const todo = emails
		.filter((email) => wanted(email) && !inFlight.has(`${account}:${email.id}`))
		.slice(0, opts.limit ?? MAX_PER_LIST);
	if (todo.length === 0) return 0;
	for (const email of todo) inFlight.add(`${account}:${email.id}`);
	void run(client, todo.map((email) => email.id), opts.ai)
		.catch((cause) => console.warn('[categorize]', cause))
		.finally(() => todo.forEach((email) => inFlight.delete(`${account}:${email.id}`)));
	return todo.length;
}

async function run(client: JMAPClient, ids: string[], ai: AiSettings): Promise<void> {
	const emails = await fetchForClassifier(client, ids);
	const answers = await Promise.all(emails.map((email) => classify(email, ai).catch(() => undefined)));
	const patches: Record<string, Record<string, true | null>> = {};
	const newsletters: ClassifierEmail[] = [];
	emails.forEach((email, i) => {
		const next = answers[i];
		if (next === 'newsletters') newsletters.push(email);
		const was = categoryOf(email.keywords);
		if (!next || next === was) return;
		patches[email.id] = { [categoryKeyword(next)]: true };
		if (was) patches[email.id]![categoryKeyword(was)] = null;
	});
	await client.patchKeywords(patches);
	if (ai.archiveNewsletters && newsletters.length > 0) await archive(client, newsletters);
}

/** Inbox → Archive for what the model called a newsletter; anything filed elsewhere is left where it is. */
async function archive(client: JMAPClient, emails: ClassifierEmail[]): Promise<void> {
	const boxes = await client.getMailboxes();
	const inbox = boxes.find((box) => box.role === 'inbox')?.id;
	const archive = boxes.find((box) => box.role === 'archive')?.id;
	if (!inbox || !archive) return;
	const ids = emails.filter((email) => email.mailboxIds?.[inbox]).map((email) => email.id);
	await client.moveEmailsToMailbox(ids, archive, inbox);
}

/** `Email/get` shaped for the classifier: the list's fields plus headers and a slice of body. */
export type ClassifierEmail = Pick<JMAPEmail, 'id' | 'keywords' | 'mailboxIds' | 'from' | 'subject' | 'preview' | 'textBody' | 'bodyValues'> &
	Partial<Record<`header:${(typeof BULK_HEADERS)[number]}:asText`, string | null>>;

async function fetchForClassifier(client: JMAPClient, ids: string[]): Promise<ClassifierEmail[]> {
	const response = await client.request([
		[
			'Email/get',
			{
				accountId: client.getAccountId(),
				ids,
				properties: CLASSIFY_PROPERTIES,
				fetchTextBodyValues: true,
				maxBodyValueBytes: BODY_BYTES
			},
			'c'
		]
	]);
	const first = response.methodResponses?.[0];
	if (first?.[0] !== 'Email/get') {
		const failure = first?.[1] as { type?: string; description?: string } | undefined;
		throw new Error(failure?.description ?? failure?.type ?? 'Email/get failed');
	}
	return ((first[1] as { list?: ClassifierEmail[] }).list ?? []).filter(Boolean);
}

/**
 * What the model is shown, as named fields rather than one flattened string.
 * The body is the plain-text part when there is one; an HTML-only message
 * falls back to the server's preview rather than sending markup. With
 * `headersOnly` there is no body at all — not even the preview, which is text.
 */
export function classifierState(email: ClassifierEmail, headersOnly = false) {
	const sender = email.from?.[0];
	const bulk: Record<string, string> = {};
	for (const name of BULK_HEADERS) {
		const value = email[`header:${name}:asText`]?.trim();
		if (value) bulk[name.toLowerCase().replace(/-/g, '_')] = value;
	}
	const text = (email.textBody ?? [])
		.filter((part) => part.type === 'text/plain' && part.partId)
		.map((part) => email.bodyValues?.[part.partId!]?.value ?? '')
		.join('\n')
		.trim();
	return {
		from: { name: sender?.name ?? '', email: sender?.email ?? '' },
		subject: email.subject ?? '',
		...(Object.keys(bulk).length > 0 ? { bulk_headers: bulk } : {}),
		...(headersOnly ? {} : { body: (text || email.preview || '').slice(0, BODY_BYTES) })
	};
}

/** One Choice, with the neighbour each option is confused with spelled out. */
export function classifierQuestions() {
	const criteria: Record<string, unknown> = Object.fromEntries(
		CATEGORIES.map((category) => [
			category.id,
			{ what: category.hint, not_for: category.notFor, examples: category.examples }
		])
	);
	criteria[CATEGORY_OTHER] = {
		what: 'Correspondence written by a person — personal or work — or anything that fits none of the others',
		examples: ['Re: lunch on Thursday?', 'Draft contract attached', 'Quick question about the invoice you sent']
	};
	return {
		cat: {
			type: 'choice',
			instructions:
				'What kind of email is this? `bulk_headers`, when present, are the mailing-list and automation headers the message carries; `body`, when present, is the start of its text.',
			criteria
		}
	};
}

const CRITERIA_IDS = new Set([...CATEGORIES.map((category) => category.id), CATEGORY_OTHER]);

export async function classify(
	email: ClassifierEmail,
	opts: Pick<AiSettings, 'floor' | 'headersOnly'> = { floor: 0.5, headersOnly: false }
): Promise<string> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		let response: Response;
		try {
			response = await fetch(ENDPOINT, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`
				},
				body: JSON.stringify({
					model: 'jev-latest',
					state: classifierState(email, opts.headersOnly),
					questions: classifierQuestions()
				}),
				signal: controller.signal
			});
		} catch (cause) {
			pausedUntil = Date.now() + PAUSE_MS;
			throw cause;
		}
		if (!response.ok) {
			// A bad key, a rate limit, an overloaded service: none of them get better
			// by asking again on the next list load.
			pausedUntil = Date.now() + PAUSE_MS;
			throw new Error(`typesafe ${response.status}`);
		}
		const data = (await response.json()) as {
			answers?: { cat?: { choice?: string; confidence?: number } };
		};
		const answer = data.answers?.cat;
		if (!answer?.choice || !CRITERIA_IDS.has(answer.choice)) throw new Error('no answer');
		return (answer.confidence ?? 0) < opts.floor ? CATEGORY_OTHER : answer.choice;
	} finally {
		clearTimeout(timer);
	}
}

/** For tests: forget a pause. */
export function resetClassifierPause(): void {
	pausedUntil = 0;
}

// ponytail: 200 a run caps the spend at cents; a "re-check everything" is a job queue, not a button.
const RECHECK_LIMIT = 200;

/**
 * Give the messages the model marked Other another look, newest first. They
 * are the AI's alone: a rule can categorise, but never as Other.
 */
export async function recheckOther(client: JMAPClient, ai: AiSettings): Promise<number> {
	const response = await client.request([
		[
			'Email/query',
			{
				accountId: client.getAccountId(),
				filter: { hasKeyword: categoryKeyword(CATEGORY_OTHER) },
				sort: [{ property: 'receivedAt', isAscending: false }],
				limit: RECHECK_LIMIT
			},
			'q'
		],
		[
			'Email/get',
			{
				accountId: client.getAccountId(),
				'#ids': { resultOf: 'q', name: 'Email/query', path: '/ids' },
				properties: ['id', 'keywords']
			},
			'g'
		]
	]);
	const got = response.methodResponses?.[1];
	if (got?.[0] !== 'Email/get') {
		const failure = got?.[1] as { type?: string; description?: string } | undefined;
		throw new Error(failure?.description ?? failure?.type ?? 'Email/query failed');
	}
	const emails = ((got[1] as { list?: Pick<JMAPEmail, 'id' | 'keywords'>[] }).list ?? []).filter(Boolean);
	return categorizeInBackground(client, emails, { ai, recheck: true, limit: RECHECK_LIMIT });
}
