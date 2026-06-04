import type { JMAPClient } from './client';
import type { StateChange } from './types';
import { getJmapEvents } from '../../routes/events.remote.js';

const POLL_INTERVAL_MS = 20_000;
const SSE_STALE_MS = 90_000;

const STATE_METHODS = [
	['Mailbox/get', 'Mailbox'],
	['Email/get', 'Email']
] as const;

export class PushListener {
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private staleTimer: ReturnType<typeof setTimeout> | null = null;
	private isRunning = false;
	private states: Record<string, string> = {};
	private callback: ((change: StateChange) => void) | null = null;
	private client: JMAPClient | null = null;
	private onVisibilityChange: (() => void) | null = null;

	start(client: JMAPClient, onChange: (change: StateChange) => void) {
		this.stop();
		this.client = client;
		this.callback = onChange;
		void this.syncStates(client);

		this.startPolling(client);

		if (typeof window !== 'undefined') {
			this.startEventSource(onChange);
		}

		if (typeof document !== 'undefined') {
			this.onVisibilityChange = () => {
				if (document.visibilityState === 'visible' && this.client) {
					void this.check(this.client);
				}
			};
			document.addEventListener('visibilitychange', this.onVisibilityChange);
		}
	}

	stop() {
		this.stopPolling();
		this.stopEventSource();
		this.clearStaleTimer();
		if (this.onVisibilityChange) {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
			this.onVisibilityChange = null;
		}
		this.states = {};
		this.callback = null;
		this.client = null;
	}

	private startPolling(client: JMAPClient) {
		this.pollInterval = setInterval(() => {
			if (this.client) void this.check(this.client);
		}, POLL_INTERVAL_MS);
	}

	private stopPolling() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}

	private startEventSource(onChange: (change: StateChange) => void) {
		this.isRunning = true;
		this.resetStaleTimer();

		void (async () => {
			try {
				for await (const change of getJmapEvents()) {
					if (!this.isRunning) break;
					this.resetStaleTimer();
					this.trackIncomingStates(change);
					onChange(change);
				}
			} catch (err) {
				console.warn('JMAP event stream error:', err);
				this.stopEventSource();
				if (this.client && this.callback) {
					setTimeout(() => {
						if (this.client && this.callback && !this.isRunning) {
							this.startEventSource(this.callback);
						}
					}, 5_000);
				}
			}
		})();
	}

	private stopEventSource() {
		this.isRunning = false;
		this.clearStaleTimer();
	}

	private resetStaleTimer() {
		this.clearStaleTimer();
		this.staleTimer = setTimeout(() => {
			this.stopEventSource();
			if (this.client && this.callback && typeof window !== 'undefined') {
				this.startEventSource(this.callback);
			}
		}, SSE_STALE_MS);
	}

	private clearStaleTimer() {
		if (this.staleTimer) {
			clearTimeout(this.staleTimer);
			this.staleTimer = null;
		}
	}

	private async syncStates(client: JMAPClient) {
		try {
			this.states = await client.fetchSyncStates();
		} catch {
			this.states = {};
		}
	}

	private trackIncomingStates(change: StateChange) {
		const accountId = this.client?.getAccountId();
		if (!accountId) return;

		const accountChanges = change.changed[accountId];
		if (!accountChanges) return;

		if (accountChanges.Mailbox) this.states.Mailbox = accountChanges.Mailbox;
		if (accountChanges.Email) this.states.Email = accountChanges.Email;
	}

	private async check(client: JMAPClient) {
		try {
			const next = await client.fetchSyncStates();
			const changes: StateChange['changed'][string] = {};
			let hasChanges = false;

			for (const [, key] of STATE_METHODS) {
				const prev = this.states[key];
				const current = next[key];
				if (!current) continue;
				if (prev && prev !== current) {
					changes[key] = current;
					hasChanges = true;
				}
			}

			this.states = { ...this.states, ...next };

			if (hasChanges && this.callback) {
				this.callback({
					'@type': 'StateChange',
					changed: { [client.getAccountId()]: changes }
				});
			}
		} catch {
			// Polling is best-effort — SSE or the next poll may recover
		}
	}
}

export const pushListener = new PushListener();
