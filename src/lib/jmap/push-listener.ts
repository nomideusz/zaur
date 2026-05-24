import type { JMAPClient } from './client';
import type { StateChange } from './types';

const POLL_INTERVAL_MS = 15_000;

const STATE_METHODS = [
	['Mailbox/get', 'Mailbox'],
	['Email/get', 'Email']
] as const;

export class PushListener {
	private interval: ReturnType<typeof setInterval> | null = null;
	private eventSource: EventSource | null = null;
	private states: Record<string, string> = {};
	private callback: ((change: StateChange) => void) | null = null;
	private client: JMAPClient | null = null;

	start(client: JMAPClient, onChange: (change: StateChange) => void) {
		this.stop();
		this.client = client;
		this.callback = onChange;
		void this.syncStates(client);

		if (typeof EventSource !== 'undefined') {
			this.startEventSource(onChange);
		} else {
			this.startPolling(client);
		}
	}

	stop() {
		this.stopPolling();
		this.stopEventSource();
		this.states = {};
		this.callback = null;
		this.client = null;
	}

	private startPolling(client: JMAPClient) {
		this.interval = setInterval(() => {
			if (this.client) void this.check(this.client);
		}, POLL_INTERVAL_MS);
	}

	private stopPolling() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	private startEventSource(onChange: (change: StateChange) => void) {
		this.eventSource = new EventSource('/api/jmap/events');

		this.eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as StateChange;
				if (data['@type'] === 'StateChange') {
					onChange(data);
				}
			} catch {
				// Ignore malformed events
			}
		};

		this.eventSource.onerror = () => {
			this.stopEventSource();
			if (this.client) {
				this.startPolling(this.client);
			}
		};
	}

	private stopEventSource() {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
	}

	private async syncStates(client: JMAPClient) {
		const states = await client.fetchSyncStates();
		this.states = states;
	}

	private async check(client: JMAPClient) {
		const next = await client.fetchSyncStates();
		const changes: StateChange['changed'][string] = {};
		let hasChanges = false;

		for (const [, key] of STATE_METHODS) {
			const prev = this.states[key];
			const current = next[key];
			if (prev && current && prev !== current) {
				changes[key] = current;
				hasChanges = true;
			}
		}

		this.states = next;

		if (hasChanges && this.callback) {
			this.callback({
				'@type': 'StateChange',
				changed: { [client.getAccountId()]: changes }
			});
		}
	}
}

export const pushListener = new PushListener();
