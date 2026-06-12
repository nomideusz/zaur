import type { JMAPClient } from './client';
import type { StateChange } from './types';

const POLL_INTERVAL_MS = 20_000;
const SSE_STALE_MS = 90_000;
const SSE_RECONNECT_MS = 5_000;
const SSE_RECONNECT_MAX_MS = 120_000;

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
	private streamAbort: AbortController | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = SSE_RECONNECT_MS;
	private onOnline: (() => void) | null = null;
	private streamErrorLogged = false;

	start(client: JMAPClient, onChange: (change: StateChange) => void) {
		this.stop();
		this.client = client;
		this.callback = onChange;

		void this.bootstrapSync(client);

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

	private async bootstrapSync(client: JMAPClient) {
		await this.syncStates(client);
		await this.check(client);
	}

	stop() {
		this.stopPolling();
		this.stopEventSource();
		this.clearStaleTimer();
		this.clearReconnect();
		if (this.onVisibilityChange) {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
			this.onVisibilityChange = null;
		}
		this.states = {};
		this.callback = null;
		this.client = null;
		this.reconnectDelay = SSE_RECONNECT_MS;
		this.streamErrorLogged = false;
	}

	private clearReconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.onOnline) {
			window.removeEventListener('online', this.onOnline);
			this.onOnline = null;
		}
	}

	/** Reconnect with backoff; while offline, wait for the 'online' event instead. */
	private scheduleReconnect() {
		if (!this.client || !this.callback) return;
		this.clearReconnect();

		const reconnect = () => {
			this.clearReconnect();
			if (this.client && this.callback && !this.isRunning) {
				this.startEventSource(this.callback);
			}
		};

		if (typeof navigator !== 'undefined' && navigator.onLine === false) {
			this.onOnline = reconnect;
			window.addEventListener('online', this.onOnline, { once: true });
			return;
		}

		this.reconnectTimer = setTimeout(reconnect, this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, SSE_RECONNECT_MAX_MS);
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

		const abort = new AbortController();
		this.streamAbort = abort;

		void (async () => {
			try {
				const response = await fetch('/api/jmap/events', { signal: abort.signal });
				if (!response.ok || !response.body) {
					throw { status: response.status, body: await response.text().catch(() => '') };
				}

				// Healthy connection — reset the backoff and error squelch.
				this.reconnectDelay = SSE_RECONNECT_MS;
				this.streamErrorLogged = false;

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';

				while (this.isRunning && !abort.signal.aborted) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || trimmed.startsWith(':')) {
							this.resetStaleTimer();
							continue;
						}
						if (!trimmed.startsWith('data:')) continue;

						this.resetStaleTimer();
						const dataStr = trimmed.slice(5).trim();
						if (!dataStr) continue;

						try {
							const data = JSON.parse(dataStr) as StateChange;
							if (data?.['@type'] === 'StateChange') {
								this.trackIncomingStates(data);
								onChange(data);
							}
						} catch {
							// Ping or other non-JSON keepalive
						}
					}
				}

				// Server closed the stream gracefully — reconnect right away
				// instead of waiting for the stale timer (polling covers the gap).
				if (this.isRunning && !abort.signal.aborted) {
					this.stopEventSource();
					this.scheduleReconnect();
				}
			} catch (err) {
				if (abort.signal.aborted) return;
				// Stream interruptions (network change, proxy timeout, sleep) are
				// routine — log the first one, stay quiet while retrying.
				if (!this.streamErrorLogged) {
					console.warn('JMAP event stream interrupted (will reconnect):', err);
					this.streamErrorLogged = true;
				}
				this.stopEventSource();
				this.scheduleReconnect();
			}
		})();
	}

	private stopEventSource() {
		this.isRunning = false;
		this.streamAbort?.abort();
		this.streamAbort = null;
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
