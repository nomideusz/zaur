export type OverflowMenuPlacement = 'bottom' | 'top' | 'auto';

export function resolveOverflowMenuPlacement(
	trigger: HTMLElement,
	menu: HTMLElement,
	placement: OverflowMenuPlacement
): 'bottom' | 'top' {
	if (placement === 'top') return 'top';
	if (placement === 'bottom') return 'bottom';

	const rect = trigger.getBoundingClientRect();
	const menuHeight = menu.getBoundingClientRect().height || 240;
	const margin = 8;
	const spaceBelow = window.innerHeight - rect.bottom - margin;
	const spaceAbove = rect.top - margin;

	return spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
}

/** Fixed viewport coordinates for a portaled overflow menu. */
export function overflowMenuFixedStyle(
	trigger: HTMLElement,
	menu: HTMLElement,
	placement: OverflowMenuPlacement
): string {
	const nextPlacement = resolveOverflowMenuPlacement(trigger, menu, placement);
	const rect = trigger.getBoundingClientRect();
	const menuRect = menu.getBoundingClientRect();
	const menuHeight = menuRect.height || menu.offsetHeight || 240;
	const menuWidth = menuRect.width || menu.offsetWidth || 208;
	const margin = 8;

	let top =
		nextPlacement === 'top' ? rect.top - menuHeight - margin : rect.bottom + margin;

	top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));

	let left = rect.left;
	left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

	return `top:${top}px;left:${left}px;right:auto;`;
}
