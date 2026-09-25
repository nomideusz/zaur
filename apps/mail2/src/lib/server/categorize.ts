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
	'from',
	'subject',
	'preview',
	'textBody',
	'bodyValues',
	...BULK_HEADERS.map((name) => `header:${name}:asText`)
];

export const aiCategoriesAvailable = () => !!process.env.TYPESAFE_API_KEY;

/** The account's own switch; the list query and the push watcher both ask. */
export function aiCategoriesOn(accountKey: string): boolean {
	try {
		return !!JSON.parse(getAccountPrefs(getStoreDb(), accountKey) ?? '{}').aiCategories;
	} catch {
		return false;
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
	opts: { recheck?: boolean; limit?: number } = {}
): number {
	if (!aiCategoriesAvailable() || Date.now() < pausedUntil) return 0;
	const account = client.getAccountId();
	const wanted = (email: Pick<JMAPEmail, 'keywords'>) =>
		opts.recheck ? categoryOf(email.keywords) === CATEGORY_OTHER : !categoryOf(email.keywords);
	const todo = emails
		.filter((email) => wanted(email) && !inFlight.has(`${account}:${email.id}`))
		.slice(0, opts.limit ?? MAX_PER_LIST);
	if (todo.length === 0) return 0;
	for (const email of todo) inFlight.add(`${account}:${email.id}`);
	void run(client, todo.map((email) => email.id))
		.catch((cause) => console.warn('[categorize]', cause))
		.finally(() => todo.forEach((email) => inFlight.delete(`${account}:${email.id}`)));
	return todo.length;
}

async function run(client: JMAPClient, ids: string[]): Promise<void> {
	const emails = await fetchForClassifier(client, ids);
	const answers = await Promise.all(emails.map((email) => classify(email).catch(() => undefined)));
	const patches: Record<string, Record<string, true | null>> = {};
	emails.forEach((email, i) => {
		const next = answers[i];
		const was = categoryOf(email.keywords);
		if (!next || next === was) return;
		patches[email.id] = { [categoryKeyword(next)]: true };
		if (was) patches[email.id]![categoryKeyword(was)] = null;
	});
	await client.patchKeywords(patches);
}

/** `Email/get` shaped for the classifier: the list's fields plus headers and a slice of body. */
export type ClassifierEmail = Pick<JMAPEmail, 'id' | 'keywords' | 'from' | 'subject' | 'preview' | 'textBody' | 'bodyValues'> &
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
 * falls back to the server's preview rather than sending markup.
 */
export function classifierState(email: ClassifierEmail) {
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
		body: (text || email.preview || '').slice(0, BODY_BYTES)
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
				'What kind of email is this? `bulk_headers`, when present, are the mailing-list and automation headers the message carries; `body` is the start of its text.',
			criteria
		}
	};
}

const CRITERIA_IDS = new Set([...CATEGORIES.map((category) => category.id), CATEGORY_OTHER]);

export async function classify(email: ClassifierEmail): Promise<string> {
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
					state: classifierState(email),
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
		return (answer.confidence ?? 0) < 0.5 ? CATEGORY_OTHER : answer.choice;
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
export async function recheckOther(client: JMAPClient): Promise<number> {
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
	return categorizeInBackground(client, emails, { recheck: true, limit: RECHECK_LIMIT });
}
