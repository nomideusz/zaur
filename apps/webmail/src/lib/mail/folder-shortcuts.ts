export interface MailboxShortcutTarget {
	id: string;
	role?: string | null;
}

const SHORTCUT_ROLE_ORDER: Record<string, string[]> = {
	i: ['inbox'],
	s: ['sent'],
	d: ['drafts'],
	a: ['archive'],
	t: ['trash'],
	j: ['junk', 'spam']
};

export function resolveMailboxRouteByShortcut(
	mailboxes: MailboxShortcutTarget[],
	shortcut: string
): string | null {
	const roles = SHORTCUT_ROLE_ORDER[shortcut.toLowerCase()];
	if (!roles) return null;

	for (const role of roles) {
		const match = mailboxes.find(
			(mailbox) => mailbox.role === role || mailbox.id === role
		);
		if (match) return match.id;
	}

	return null;
}
