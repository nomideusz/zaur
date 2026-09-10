import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PushListener } from '../src/lib/jmap/push-listener.ts';

/** Polling is only the fallback: it must run while SSE is down and stop once the stream opens. */
class FakeEventSource {
	static CLOSED = 2;
	static last: FakeEventSource | null = null;
	readyState = 0;
	onopen: (() => void) | null = null;
	onmessage: ((e: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	constructor(_url: string) {
		FakeEventSource.last = this;
	}
	addEventListener() {}
	close() {
		this.readyState = FakeEventSource.CLOSED;
	}
}

describe('PushListener fallback polling', () => {
	it('polls only while the event stream is closed', async () => {
		const g = globalThis as Record<string, unknown>;
		g.window = { addEventListener() {}, removeEventListener() {} };
		g.document = { addEventListener() {}, removeEventListener() {} };
		g.EventSource = FakeEventSource;
		const intervals = new Set<unknown>();
		const realSet = globalThis.setInterval;
		const realClear = globalThis.clearInterval;
		g.setInterval = (fn: () => void, ms: number) => {
			const id = realSet(fn, ms);
			intervals.add(id);
			return id;
		};
		g.clearInterval = (id: unknown) => {
			intervals.delete(id);
			realClear(id as ReturnType<typeof setInterval>);
		};
		const client = {
			fetchSyncStates: async () => ({}),
			getAccountId: () => 'a'
		} as never;

		const listener = new PushListener();
		try {
			listener.start(client, () => {});
			assert.equal(intervals.size, 0, 'no poll while SSE is connecting');

			FakeEventSource.last!.readyState = FakeEventSource.CLOSED;
			FakeEventSource.last!.onerror!();
			assert.equal(intervals.size, 1, 'poll starts when SSE closes');

			// Reconnect timer fires -> new EventSource; opening it stops the poll.
			await new Promise((r) => setTimeout(r, 5_100));
			FakeEventSource.last!.onopen!();
			assert.equal(intervals.size, 0, 'poll stops when SSE opens');

			listener.stop();
			assert.equal(intervals.size, 0, 'stop leaves no poll behind');
		} finally {
			listener.stop();
			g.setInterval = realSet;
			g.clearInterval = realClear;
		}
	});
});
