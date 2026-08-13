export function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;
	const el = target instanceof HTMLElement ? target : target.parentElement;
	if (!el) return false;
	if (el.closest('[contenteditable="true"], [contenteditable=""]')) return true;
	if (el instanceof HTMLInputElement) {
		const type = el.type;
		return type !== 'checkbox' && type !== 'radio' && type !== 'range' && type !== 'button';
	}
	return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

/** Insert `text` over the current selection in a controlled textarea value. */
export function spliceSelection(
	value: string,
	start: number,
	end: number,
	text: string
): { value: string; caret: number } {
	const from = Math.max(0, Math.min(start, value.length));
	const to = Math.max(from, Math.min(end, value.length));
	return { value: value.slice(0, from) + text + value.slice(to), caret: from + text.length };
}
