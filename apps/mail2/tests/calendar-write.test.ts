import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JMAPClient } from '@zaur/mail-core';

/**
 * What goes on the wire for `calendarIds`, pinned against a stub. Every bug
 * here has been silent: the server takes the request, answers "updated", and
 * the event is simply filed somewhere other than where the person put it.
 */
const SESSION = {
	apiUrl: 'https://mail.test/jmap/',
	accountId: 'b',
	username: 'someone@mail.test',
	primaryAccounts: { 'urn:ietf:params:jmap:mail': 'b', 'urn:ietf:params:jmap:calendars': 'b' },
	accounts: { b: { name: 'someone@mail.test', accountCapabilities: { 'urn:ietf:params:jmap:calendars': {} } } },
	capabilities: { 'urn:ietf:params:jmap:core': {}, 'urn:ietf:params:jmap:calendars': {} }
};

/** Connects a client whose every JMAP call is recorded instead of sent. */
async function stubbedClient() {
	const sent: Record<string, unknown>[] = [];
	const realFetch = globalThis.fetch;
	globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
		const href = String(url);
		if (href.includes('.well-known/jmap')) {
			return new Response(JSON.stringify(SESSION), { status: 200 });
		}
		const body = JSON.parse(String(init?.body)) as { methodCalls: [string, Record<string, unknown>, string][] };
		for (const [, args] of body.methodCalls) sent.push(args);
		return new Response(
			JSON.stringify({
				methodResponses: body.methodCalls.map(([name, args, id]) => [
					name,
					{
						created: Object.fromEntries(
							Object.keys((args.create as object) ?? {}).map((key) => [key, { id: 'x' }])
						),
						updated: { x: null }
					},
					id
				])
			}),
			{ status: 200 }
		);
	}) as typeof fetch;

	// A fresh server URL per client keeps the module-level session cache out of it.
	const client = new JMAPClient(`https://mail-${Math.random()}.test`, SESSION.username, 'secret');
	await client.connect();
	return { client, sent, restore: () => { globalThis.fetch = realFetch; } };
}

const base = {
	title: 'Dentist',
	start: '2026-09-19T09:00:00',
	duration: 'PT1H',
	timeZone: 'Europe/Warsaw',
	showWithoutTime: false
};

test('create files the event in the calendar that was picked', async () => {
	const { client, sent, restore } = await stubbedClient();
	try {
		await client.createCalendarEvent({ ...base, calendarId: 'work' });
		// The creation key is generated, so read the one value behind it.
		const [created] = Object.values(sent[0].create as Record<string, Record<string, unknown>>);
		assert.deepEqual(created.calendarIds, { work: true });
	} finally {
		restore();
	}
});

test('a move unfiles the event from where it was', async () => {
	const { client, sent, restore } = await stubbedClient();
	try {
		await client.updateCalendarEvent('x', { ...base, calendarId: 'work', previousCalendarIds: ['home'] });
		const patch = (sent[0].update as Record<string, Record<string, unknown>>).x;
		assert.deepEqual(patch.calendarIds, { work: true, home: null });
	} finally {
		restore();
	}
});

test('an edit that did not touch the calendar leaves the filing alone', async () => {
	const { client, sent, restore } = await stubbedClient();
	try {
		// An event can be filed in several calendars; the editor offers one.
		// Writing the property here would unfile it from `shared`.
		await client.updateCalendarEvent('x', {
			...base,
			calendarId: 'home',
			previousCalendarIds: ['home', 'shared']
		});
		const patch = (sent[0].update as Record<string, Record<string, unknown>>).x;
		assert.equal('calendarIds' in patch, false);
	} finally {
		restore();
	}
});

test('an occurrence override never carries calendarIds', async () => {
	const { client, sent, restore } = await stubbedClient();
	try {
		await client.updateCalendarEvent('x', {
			...base,
			calendarId: 'work',
			previousCalendarIds: ['home'],
			occurrence: true
		});
		const patch = (sent[0].update as Record<string, Record<string, unknown>>).x;
		assert.equal('calendarIds' in patch, false);
	} finally {
		restore();
	}
});
