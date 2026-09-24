import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JMAPClient } from '@zaur/mail-core';

/**
 * Sending against a stub server: the account with no identity (which made
 * every send fail "Identity not found"), and what a refused send leaves behind.
 */
const SESSION = {
	apiUrl: 'https://mail.test/jmap/',
	accountId: 'b',
	username: 'someone@mail.test',
	primaryAccounts: { 'urn:ietf:params:jmap:mail': 'b' },
	accounts: { b: { name: 'someone@mail.test', accountCapabilities: {} } },
	capabilities: { 'urn:ietf:params:jmap:core': {}, 'urn:ietf:params:jmap:mail': {} }
};

type Call = [string, Record<string, unknown>];

async function stubbedClient(answer: (name: string, args: Record<string, unknown>) => Record<string, unknown>) {
	const calls: Call[] = [];
	const realFetch = globalThis.fetch;
	globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
		if (String(url).includes('.well-known/jmap')) return new Response(JSON.stringify(SESSION));
		const body = JSON.parse(String(init?.body)) as { methodCalls: [string, Record<string, unknown>, string][] };
		const methodResponses = body.methodCalls.map(([name, args, id]) => {
			calls.push([name, args]);
			return [name, answer(name, args), id];
		});
		return new Response(JSON.stringify({ methodResponses }));
	}) as typeof fetch;
	const client = new JMAPClient(`https://mail-${Math.random()}.test`, SESSION.username, 'secret');
	await client.connect();
	return { client, calls, restore: () => void (globalThis.fetch = realFetch) };
}

test('an account with no identity gets its own address as one', async () => {
	let identities: Record<string, unknown>[] = [];
	const { client, calls, restore } = await stubbedClient((name, args) => {
		if (name === 'Identity/set') {
			identities = Object.values(args.create as object).map((identity) => ({ id: 'i1', ...identity }));
			return { created: { i0: { id: 'i1' } } };
		}
		return { list: identities };
	});
	try {
		const list = await client.getIdentities();
		assert.deepEqual(list.map((identity) => identity.email), ['someone@mail.test']);
		assert.equal(calls.filter(([name]) => name === 'Identity/set').length, 1);
		await client.getIdentities();
		assert.equal(calls.filter(([name]) => name === 'Identity/set').length, 1, 'only when there are none');
	} finally {
		restore();
	}
});

test('a request over the concurrency limit waits for a slot', async () => {
	const { client, calls, restore } = await stubbedClient(() => ({ list: [{ id: 'inbox' }] }));
	const stubbed = globalThis.fetch;
	let refusals = 2;
	globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
		if (refusals-- > 0) {
			const limit = { type: 'urn:ietf:params:jmap:error:limit', status: 400, limit: 'maxConcurrentRequests' };
			return new Response(JSON.stringify(limit), { status: 400 });
		}
		return stubbed(url, init);
	}) as typeof fetch;
	try {
		assert.deepEqual(await client.getMailboxes(), [{ id: 'inbox' }]);
		assert.equal(calls.length, 1);
	} finally {
		restore();
	}
});

const mailboxes = { list: [{ id: 'sent', role: 'sent' }] };

function sendStub(submission: Record<string, unknown>, emailUpdate: Record<string, unknown> = {}) {
	return (name: string, args: Record<string, unknown>) => {
		if (name === 'Mailbox/get') return mailboxes;
		if (name === 'Identity/get') return { list: [{ id: 'i1', email: 'someone@mail.test' }] };
		if (name === 'Email/set' && args.create) return { created: { outgoing: { id: 'm1' } } };
		if (name === 'EmailSubmission/set') return submission;
		return emailUpdate;
	};
}

test('a refused send takes its copy back out of Sent', async () => {
	const { client, calls, restore } = await stubbedClient(
		sendStub({ notCreated: { '1': { type: 'invalidProperties', description: 'Identity not found.' } } })
	);
	try {
		await assert.rejects(client.sendEmail(['a@b.test'], 'Hi', 'Hello'), /Identity not found/);
		const destroy = calls.find(([name, args]) => name === 'Email/set' && args.destroy);
		assert.deepEqual(destroy?.[1].destroy, ['m1']);
	} finally {
		restore();
	}
});

test('an accepted send keeps its copy even when filing it fails', async () => {
	const { client, calls, restore } = await stubbedClient(
		sendStub({ created: { '1': { id: 's1' } }, notUpdated: { m1: { type: 'notFound' } } })
	);
	try {
		await assert.rejects(client.sendEmail(['a@b.test'], 'Hi', 'Hello'));
		assert.equal(calls.find(([name, args]) => name === 'Email/set' && args.destroy), undefined);
	} finally {
		restore();
	}
});
