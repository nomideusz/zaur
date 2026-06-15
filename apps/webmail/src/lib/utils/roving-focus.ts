import type { Action } from 'svelte/action';

const ITEM_SELECTOR = '[data-roving-item]:not([disabled])';

/** Focus the first roving item in a container — e.g. on ArrowDown from a search input. */
export function focusFirstItem(container: HTMLElement | null | undefined): boolean {
	const first = container?.querySelector<HTMLElement>(ITEM_SELECTOR);
	if (!first) return false;
	first.focus();
	return true;
}

/**
 * Roving keyboard focus among `[data-roving-item]` descendants — the ArrowUp/Down/
 * Home/End navigation bits-ui Command gave our filtered dropdown lists. Items are real
 * buttons, so Enter/Space activation and hover/focus styling come for free natively.
 */
export const rovingFocus: Action = (node) => {
	function items() {
		return Array.from(node.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
	}
	function onKeydown(event: KeyboardEvent) {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
		const list = items();
		if (!list.length) return;
		const index = list.indexOf(document.activeElement as HTMLElement);
		event.preventDefault();
		if (event.key === 'ArrowDown') list[Math.min(index + 1, list.length - 1)]?.focus();
		else if (event.key === 'ArrowUp') list[Math.max(index - 1, 0)]?.focus();
		else if (event.key === 'Home') list[0]?.focus();
		else list[list.length - 1]?.focus();
	}
	node.addEventListener('keydown', onKeydown);
	return { destroy: () => node.removeEventListener('keydown', onKeydown) };
};
