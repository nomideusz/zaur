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

	setMail(ctx: MailHeaderContext) {
		this.mail = ctx;
	}

	clearMail() {
		this.mail = null;
	}
}

export const shellHeader = new ShellHeaderStore();
