/**
 * Background categorisation of mail no rule caught, with TypeSafe's Jev.
 *
 * Off unless the server has `TYPESAFE_API_KEY` **and** the account turned it on
 * in Settings: it sends sender, subject and preview to a third party. The
 * result is written as a `cat.<id>` keyword, so it is stored once, rules made
 * at delivery always win (a categorised message is never looked at again), and
 * the list refreshes on its own through the Email state change.
 */
import { CATEGORIES, CATEGORY_OTHER, categoryKeyword, categoryOf } from '@zaur/mail-core';
import type { JMAPClient, JMAPEmail } from '@zaur/mail-core';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MAX_PER_LIST = 25;

export const aiCategoriesAvailable = () => !!process.env.TYPESAFE_API_KEY;

// ponytail: in-flight set per process; a second server instance may classify the same message twice, harmless.
const inFlight = new Set<string>();

export function categorizeInBackground(client: JMAPClient, emails: JMAPEmail[]): void {
	if (!aiCategoriesAvailable()) return;
	const todo = emails
		.filter((email) => !categoryOf(email.keywords) && !inFlight.has(email.id))
		.slice(0, MAX_PER_LIST);
	if (todo.length === 0) return;
	for (const email of todo) inFlight.add(email.id);
	void Promise.all(todo.map((email) => classify(email).catch(() => undefined)))
		.then((ids) => {
			const patches: Record<string, Record<string, true | null>> = {};
			todo.forEach((email, i) => {
				if (ids[i]) patches[email.id] = { [categoryKeyword(ids[i]!)]: true };
			});
			return client.patchKeywords(patches);
		})
		.catch((cause) => console.warn('[categorize]', cause))
		.finally(() => todo.forEach((email) => inFlight.delete(email.id)));
}

export async function classify(email: JMAPEmail): Promise<string> {
	const sender = email.from?.[0];
	const state = [
		`From: ${sender?.name ? `${sender.name} <${sender.email}>` : sender?.email ?? ''}`,
		`Subject: ${email.subject ?? ''}`,
		'',
		(email.preview ?? '').slice(0, 1500)
	].join('\n');
	const criteria: Record<string, string> = Object.fromEntries(
		CATEGORIES.map((category) => [category.id, category.hint])
	);
	criteria[CATEGORY_OTHER] = 'Personal or work correspondence from a person, or anything that fits none of the others';
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 8000);
	try {
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`
			},
			body: JSON.stringify({
				model: 'jev-latest',
				state,
				questions: {
					cat: { type: 'choice', instructions: 'What kind of email is this?', criteria }
				}
			}),
			signal: controller.signal
		});
		if (!response.ok) throw new Error(`typesafe ${response.status}`);
		const data = (await response.json()) as {
			answers?: { cat?: { choice?: string; confidence?: number } };
		};
		const answer = data.answers?.cat;
		if (!answer?.choice || !(answer.choice in criteria)) throw new Error('no answer');
		return (answer.confidence ?? 0) < 0.5 ? CATEGORY_OTHER : answer.choice;
	} finally {
		clearTimeout(timer);
	}
}
