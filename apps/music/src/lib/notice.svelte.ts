/**
 * The app's one status line (shown above the dock by the layout): short
 * confirmations and failures that would otherwise pass in silence.
 */
class Notice {
	text = $state('');
	#timer: ReturnType<typeof setTimeout> | undefined;

	show(message: string, ms = 3500): void {
		clearTimeout(this.#timer);
		this.text = message;
		this.#timer = setTimeout(() => (this.text = ''), ms);
	}
}

export const notice = new Notice();
export const notify = (message: string, ms?: number) => notice.show(message, ms);
