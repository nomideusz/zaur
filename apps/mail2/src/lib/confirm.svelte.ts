/**
 * The one way Mail asks before it does something it cannot take back: a
 * delete for good, a revoke, a sign-out, a switch that drops formatting.
 * `ask` opens the shared `ConfirmDialog` (mounted once, in the root layout)
 * and resolves true when the person takes the action, false on Cancel,
 * Escape or a click outside.
 *
 * Not for leaving unsaved work (`leave-guard`): `beforeNavigate` has to
 * cancel synchronously, so that one keeps the browser's own `confirm`.
 */
export interface Confirmation {
	/** The question, ending in "?": "Delete “Receipts”?" */
	title: string;
	/** What follows from it, when the title alone does not say. */
	body?: string;
	/** The button's verb, naming what happens: "Delete forever", not "OK". */
	action: string;
	/** `danger` (the default) takes the discard channel and starts on Cancel. */
	tone?: 'danger' | 'neutral';
}

type Open = Confirmation & { settle: (ok: boolean) => void };

export const confirmation = $state<{ open: Open | null }>({ open: null });

export function ask(request: Confirmation): Promise<boolean> {
	// A second question replaces the first, which counts as a Cancel.
	confirmation.open?.settle(false);
	return new Promise((resolve) => {
		confirmation.open = {
			...request,
			settle: (ok) => {
				confirmation.open = null;
				resolve(ok);
			}
		};
	});
}
