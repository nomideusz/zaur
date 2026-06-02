/**
 * Per-session reading chrome overrides, seeded from settings when a thread opens.
 */
class ReaderFocusStore {
	/** "Clean reading view" — strips noisy HTML chrome in the message body. */
	clean = $state(false);

	toggleClean() {
		this.clean = !this.clean;
	}

	setClean(value: boolean) {
		this.clean = value;
	}
}

export const readerFocus = new ReaderFocusStore();
