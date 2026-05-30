/**
 * Transient focused-reading state. When active, the reading layout collapses the
 * folder sidebar and slims the message list so a single message can be read
 * without the surrounding panes competing for attention.
 *
 * This is intentionally session-only (not persisted): the persisted preference
 * `settings.focusReadingDefault` decides whether focus turns on automatically
 * when a thread is opened.
 */
class ReaderFocusStore {
	active = $state(false);
	/** Per-session "clean reading view" override, seeded from settings when a thread opens. */
	clean = $state(false);

	toggle() {
		this.active = !this.active;
	}

	set(value: boolean) {
		this.active = value;
	}

	toggleClean() {
		this.clean = !this.clean;
	}

	setClean(value: boolean) {
		this.clean = value;
	}
}

export const readerFocus = new ReaderFocusStore();
