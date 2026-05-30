import type { Action } from 'svelte/action';

export const portal: Action<HTMLElement, ParentNode | undefined> = (node, target = document.body) => {
	if (!target) return;
	target.appendChild(node);
	return {
		destroy() {
			if (node.parentNode === target) {
				target.removeChild(node);
			}
		}
	};
};
