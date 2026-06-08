import { browser } from '$app/environment';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
	title?: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: ConfirmTone;
}

class ConfirmStore {
	open = $state(false);
	request = $state<Required<ConfirmOptions> | null>(null);

	private resolve: ((value: boolean) => void) | null = null;

	ask(options: ConfirmOptions | string): Promise<boolean> {
		if (!browser) return Promise.resolve(false);

		return new Promise((resolve) => {
			const normalized =
				typeof options === 'string'
					? { description: options }
					: options;

			this.request = {
				title: normalized.title ?? 'Confirm',
				description: normalized.description,
				confirmLabel: normalized.confirmLabel ?? 'Confirm',
				cancelLabel: normalized.cancelLabel ?? 'Cancel',
				tone: normalized.tone ?? 'default'
			};
			this.resolve = resolve;
			this.open = true;
		});
	}

	private settle(confirmed: boolean) {
		const resolve = this.resolve;
		this.resolve = null;
		this.open = false;
		this.request = null;
		resolve?.(confirmed);
	}

	confirm() {
		this.settle(true);
	}

	cancel() {
		this.settle(false);
	}

	onOpenChange(open: boolean) {
		if (!open && this.resolve) this.cancel();
		else this.open = open;
	}
}

export const confirm = new ConfirmStore();
