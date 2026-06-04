import { query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { createConnectedClient } from '$lib/server/jmap';
import { readSession } from '$lib/server/session';
import type { StateChange } from '$lib/jmap/types';

function getSession() {
	const { cookies } = getRequestEvent();
	const session = readSession(cookies);
	if (!session) {
		error(401, 'Unauthorized');
	}
	return session;
}

async function* readLines(reader: ReadableStreamDefaultReader<Uint8Array>) {
	const decoder = new TextDecoder();
	let buffer = '';
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				yield line;
			}
		}
		if (buffer) {
			yield buffer;
		}
	} finally {
		reader.releaseLock();
	}
}

export const getJmapEvents = query.live(async function* () {
	const session = getSession();
	const client = await createConnectedClient(session);
	if (!client.getSession()?.eventSourceUrl) {
		error(501, 'EventSource not available');
	}

	const upstream = await client.openEventStream();
	if (!upstream.ok || !upstream.body) {
		error(502, 'Failed to connect to push stream');
	}

	const reader = upstream.body.getReader();
	try {
		for await (const line of readLines(reader)) {
			const trimmed = line.trim();
			if (!trimmed || !trimmed.startsWith('data:')) continue;
			
			const dataStr = trimmed.slice(5).trim();
			try {
				const data = JSON.parse(dataStr);
				if (data && data['@type'] === 'StateChange') {
					yield data as StateChange;
				}
			} catch {
				// Ignore JSON parse errors for keepalives
			}
		}
	} catch (err) {
		console.warn('JMAP event stream query.live server error:', err);
	} finally {
		void reader.cancel().catch(() => {});
	}
});
