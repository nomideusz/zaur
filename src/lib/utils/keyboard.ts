export function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	if (target instanceof HTMLInputElement) {
		const type = target.type;
		return type !== 'checkbox' && type !== 'radio' && type !== 'range' && type !== 'button';
	}
	return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}
