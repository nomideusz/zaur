import type { StateChange } from '@zaur/mail-core';

/** Which JMAP types a push told us about, so a caller refreshes only those. */
export type ChangedTypes = {
	email: boolean;
	mailbox: boolean;
	/** ContactCard or AddressBook — the address book pane and compose suggestions. */
	contact: boolean;
	/** CalendarEvent or Calendar — the calendar pane. */
	calendar: boolean;
};

const NOTHING: ChangedTypes = { email: false, mailbox: false, contact: false, calendar: false };
export const EVERYTHING: ChangedTypes = { email: true, mailbox: true, contact: true, calendar: true };

export function anyChanged(changed: ChangedTypes): boolean {
	return changed.email || changed.mailbox || changed.contact || changed.calendar;
}

/**
 * What a `StateChange` means for this shell.
 *
 * The payload is keyed by account; this shell has one, and any account it hears
 * about is the one whose mail it is showing (shared address books and
 * calendars live in other accounts, and a change there is still a change to
 * what is on screen). An Email change moves unread counts, so the folder list
 * follows it even when Mailbox itself did not change state — Stalwart is not
 * obliged to bump both.
 */
export function changedTypes(change: StateChange | null | undefined): ChangedTypes {
	if (change?.['@type'] !== 'StateChange') return { ...NOTHING };
	let email = false;
	let mailbox = false;
	let contact = false;
	let calendar = false;
	for (const types of Object.values(change.changed ?? {})) {
		if (types?.Email) email = true;
		if (types?.Mailbox) mailbox = true;
		if (types?.ContactCard || types?.AddressBook) contact = true;
		if (types?.CalendarEvent || types?.Calendar) calendar = true;
	}
	return { email, mailbox: mailbox || email, contact, calendar };
}

const STALE_MS = 90_000;
const RECONNECT_MS = 5_000;
const RECONNECT_MAX_MS = 120_000;
/** Only while the stream is down — push is the channel, this is the net. */
const POLL_MS = 20_000;

/**
 * JMAP push for the mail shell.
 *
 * The README has always said "JMAP is live, so there is nothing to refresh by
 * hand" — this is the part that makes that true. Stalwart pushes RFC 8620
 * `StateChange` events through `/api/events`; all this has to do is say *what*
 * changed, and the page re-runs the remote queries that cover it.
 *
 * It is much smaller than webmail 1.0's `PushListener` because there is no
 * local database to reconcile: 1.0 had to diff `Email/changes` against RxDB,
 * while a remote `query` just re-runs. What is worth keeping from 1.0 is the
 * hard-won robustness, and that is all here:
 *
 * - **A stale timer.** A dropped connection can leave an `EventSource` that
 *   never fires `error` and never delivers again. Nothing heard for 90s
 *   (pings included) means the stream is dead however healthy it claims to be.
 * - **Polling while down**, so a broken stream degrades instead of failing.
 * - **Capped backoff** on a permanent close. `EventSource` cannot see the
 *   response status, so a deployment with no `eventSourceUrl` (our 501) is
 *   indistinguishable from a flaky one — the cap is what keeps that case from
 *   becoming a hot loop, and polling is what keeps it working meanwhile.
 * - **Catch up when the tab is shown again**, because a backgrounded tab may
 *   have been throttled, and this is the moment the answer is looked at.
 * - **Reconnect on `online`**, rather than counting down through an offline
 *   stretch.
 */
export class LiveUpdates {
	#source: EventSource | null = null;
	#onChange: ((changed: ChangedTypes) => void) | null = null;
	#poll: ReturnType<typeof setInterval> | null = null;
	#staleTimer: ReturnType<typeof setTimeout> | null = null;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#reconnectDelay = RECONNECT_MS;
	/** The first open is the page load, which has just fetched — do not re-fetch. */
	#opened = false;
	#loggedError = false;
	#onVisible: (() => void) | null = null;
	#onOnline: (() => void) | null = null;

	start(onChange: (changed: ChangedTypes) => void) {
		if (typeof window === 'undefined') return;
		this.stop();
		this.#onChange = onChange;
		this.#opened = false;
		this.#reconnectDelay = RECONNECT_MS;

		this.#openStream();

		this.#onVisible = () => {
			if (document.visibilityState !== 'visible') return;
			this.#everything();
			// A throttled background tab can have had its stream killed.
			if (!this.#source) this.#openStream();
		};
		document.addEventListener('visibilitychange', this.#onVisible);

		this.#onOnline = () => {
			this.#reconnectDelay = RECONNECT_MS;
			this.#everything();
			if (!this.#source) this.#openStream();
		};
		window.addEventListener('online', this.#onOnline);
	}

	stop() {
		this.#closeStream();
		this.#stopPolling();
		this.#clearReconnect();
		if (this.#onVisible) document.removeEventListener('visibilitychange', this.#onVisible);
		if (this.#onOnline) window.removeEventListener('online', this.#onOnline);
		this.#onVisible = null;
		this.#onOnline = null;
		this.#onChange = null;
	}

	/** Treat everything as changed — for when we know we may have missed events. */
	#everything() {
		this.#onChange?.({ ...EVERYTHING });
	}

	#openStream() {
		if (!this.#onChange) return;
		this.#clearReconnect();

		const source = new EventSource('/api/events');
		this.#source = source;
		this.#resetStaleTimer();

		const onData = (event: MessageEvent) => {
			this.#resetStaleTimer();
			this.#reconnectDelay = RECONNECT_MS;
			this.#loggedError = false;
			let change: StateChange;
			try {
				change = JSON.parse(event.data as string) as StateChange;
			} catch {
				return; // a ping, or something we do not speak
			}
			const changed = changedTypes(change);
			if (anyChanged(changed)) this.#onChange?.(changed);
		};

		source.onopen = () => {
			this.#reconnectDelay = RECONNECT_MS;
			this.#loggedError = false;
			this.#resetStaleTimer();
			this.#stopPolling();
			// Catch up on whatever changed while the stream was down — but the
			// first open is the page load, which has just fetched everything.
			if (this.#opened) this.#everything();
			this.#opened = true;
		};
		// Stalwart names its events `state`; `onmessage` covers unnamed ones.
		source.onmessage = onData;
		source.addEventListener('state', onData);
		source.addEventListener('ping', () => this.#resetStaleTimer());
		source.onerror = () => {
			// EventSource retries transient drops itself. Only a permanent close
			// (non-200, wrong content type) is ours to handle.
			if (source.readyState !== EventSource.CLOSED) return;
			if (!this.#loggedError) {
				console.warn('[live] push stream closed; falling back to polling');
				this.#loggedError = true;
			}
			this.#closeStream();
			this.#startPolling();
			this.#scheduleReconnect();
		};
	}

	#closeStream() {
		this.#source?.close();
		this.#source = null;
		this.#clearStale();
	}

	#scheduleReconnect() {
		this.#clearReconnect();
		// Offline: `online` will bring it back, so do not burn attempts.
		if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
		this.#reconnectTimer = setTimeout(() => this.#openStream(), this.#reconnectDelay);
		this.#reconnectDelay = Math.min(this.#reconnectDelay * 2, RECONNECT_MAX_MS);
	}

	/**
	 * A stream quiet for 90s is dead even if it has not said so. Reopen rather
	 * than wait for an `error` that may never arrive.
	 */
	#resetStaleTimer() {
		this.#clearStale();
		this.#staleTimer = setTimeout(() => {
			this.#closeStream();
			this.#startPolling();
			this.#openStream();
		}, STALE_MS);
	}

	#startPolling() {
		if (this.#poll) return;
		this.#poll = setInterval(() => this.#everything(), POLL_MS);
	}

	#stopPolling() {
		if (!this.#poll) return;
		clearInterval(this.#poll);
		this.#poll = null;
	}

	#clearStale() {
		if (this.#staleTimer) clearTimeout(this.#staleTimer);
		this.#staleTimer = null;
	}

	#clearReconnect() {
		if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
		this.#reconnectTimer = null;
	}
}
