export type MailHeaderContext = {
	mailboxName: string;
	countLabel: string;
	mailboxRouteId?: string;
	loading: boolean;
	error: string | null;
	messageCount: number;
	onBulkAction?: () => void;
	onBack?: () => void;
	showNewMessage: boolean;
};

class ShellHeaderStore {
	mail = $state<MailHeaderContext | null>(null);
	#mailGeneration = 0;

	setMail(ctx: MailHeaderContext): number {
		const generation = ++this.#mailGeneration;
		this.mail = ctx;
		return generation;
	}

	clearMail(generation?: number) {
		if (generation !== undefined && generation !== this.#mailGeneration) return;
		this.mail = null;
	}
}

export const shellHeader = new ShellHeaderStore();
