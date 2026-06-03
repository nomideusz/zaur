import type { Mailbox, MailboxRole } from '$lib/types/mail';

/** Canonical folder kinds used for routes, sorting, and display. */
export type MailboxKind =
	| 'inbox'
	| 'drafts'
	| 'sent'
	| 'archive'
	| 'junk'
	| 'trash'
	| 'important'
	| 'scheduled'
	| 'memos'
	| 'snoozed'
	| 'custom';

export const MAILBOX_DISPLAY_NAMES: Record<Exclude<MailboxKind, 'custom'>, string> = {
	inbox: 'Emails',
	drafts: 'Drafts',
	sent: 'Sent',
	archive: 'Archive',
	junk: 'Spam',
	trash: 'Trash',
	important: 'Important',
	scheduled: 'Scheduled',
	memos: 'Memos',
	snoozed: 'Snoozed'
};

/** Server mailbox names (and legacy aliases) mapped to a canonical kind. */
const NAME_TO_KIND: Record<string, MailboxKind> = {
	inbox: 'inbox',
	'e-mails': 'inbox',
	emails: 'inbox',
	drafts: 'drafts',
	sent: 'sent',
	'sent items': 'sent',
	archive: 'archive',
	junk: 'junk',
	'junk mail': 'junk',
	spam: 'junk',
	trash: 'trash',
	bin: 'trash',
	'deleted items': 'trash',
	deleted: 'trash',
	important: 'important',
	starred: 'important',
	marked: 'important',
	zaured: 'important',
	scheduled: 'scheduled',
	memos: 'memos',
	notes: 'memos',
	snoozed: 'snoozed'
};

const JMAP_ROLE_TO_KIND: Partial<Record<string, MailboxKind>> = {
	inbox: 'inbox',
	drafts: 'drafts',
	sent: 'sent',
	archive: 'archive',
	junk: 'junk',
	spam: 'junk',
	trash: 'trash'
};

export const MAILBOX_KIND_ORDER: Record<MailboxKind, number> = {
	inbox: 0,
	drafts: 1,
	sent: 2,
	important: 3,
	scheduled: 4,
	snoozed: 5,
	memos: 6,
	archive: 7,
	junk: 8,
	trash: 9,
	custom: 99
};

export function resolveMailboxKind(mailbox: {
	name: string;
	role?: string | null;
}): MailboxKind {
	const role = mailbox.role?.toLowerCase();
	if (role && role !== 'custom' && JMAP_ROLE_TO_KIND[role]) {
		return JMAP_ROLE_TO_KIND[role]!;
	}

	const normalized = mailbox.name.trim().toLowerCase();
	if (NAME_TO_KIND[normalized]) return NAME_TO_KIND[normalized];

	return 'custom';
}

export function mailboxRouteId(jmapId: string, kind: MailboxKind): string {
	return kind === 'custom' ? jmapId : kind;
}

export function mailboxDisplayName(
	kind: MailboxKind,
	fallbackName = 'Folder'
): string {
	if (kind === 'custom') return fallbackName;
	return MAILBOX_DISPLAY_NAMES[kind];
}

export function mailboxRoleFromKind(kind: MailboxKind): MailboxRole {
	return kind === 'custom' ? 'custom' : kind;
}

export function mailboxKindOrder(kind: MailboxKind | undefined): number {
	if (!kind) return MAILBOX_KIND_ORDER.custom;
	return MAILBOX_KIND_ORDER[kind] ?? MAILBOX_KIND_ORDER.custom;
}

export function mailboxKindOrderForMailbox(mailbox: {
	name: string;
	role?: MailboxRole;
}): number {
	const kind =
		mailbox.role && mailbox.role !== 'custom'
			? (mailbox.role as MailboxKind)
			: resolveMailboxKind({ name: mailbox.name, role: mailbox.role });
	return mailboxKindOrder(kind);
}

/** Folders offered in “Move to…” — exclude system folders with dedicated actions. */
const MOVE_TARGET_EXCLUDED_ROLES = new Set<MailboxRole>([
	'inbox',
	'archive',
	'important',
	'scheduled',
	'snoozed',
	'memos',
	'trash',
	'sent',
	'drafts',
	'junk'
]);

export function moveTargetMailboxes(
	mailboxes: Mailbox[],
	currentMailbox?: Pick<Mailbox, 'id'> | null
): Mailbox[] {
	return mailboxes.filter(
		(mb) =>
			mb.jmapId &&
			mb.id !== currentMailbox?.id &&
			(!mb.role || !MOVE_TARGET_EXCLUDED_ROLES.has(mb.role))
	);
}

/** Trash, spam, and drafts cannot be marked Important. */
const IMPORTANT_MARK_BLOCKED_ROLES = new Set<MailboxRole>(['trash', 'junk', 'drafts']);

/** Trash and spam — Important is cleared when mail moves here. */
const IMPORTANT_CLEAR_ON_MOVE_ROLES = new Set<MailboxRole>(['trash', 'junk']);

export function canMarkImportantFromMailboxRole(role: MailboxRole | undefined | null): boolean {
	if (!role) return true;
	return !IMPORTANT_MARK_BLOCKED_ROLES.has(role);
}

export function shouldClearImportantOnMoveTo(role: MailboxRole | undefined | null): boolean {
	if (!role) return false;
	return IMPORTANT_CLEAR_ON_MOVE_ROLES.has(role);
}

/** Rainbow styling — excluded in trash/spam/drafts views. */
export function shouldShowImportantRainbow(role: MailboxRole | undefined | null): boolean {
	return canMarkImportantFromMailboxRole(role);
}

/** Rainbow styling when the user has not turned off colorful Important subjects. */
export function shouldPresentImportantColors(
	role: MailboxRole | undefined | null,
	showColors: boolean
): boolean {
	return showColors && shouldShowImportantRainbow(role);
}

export function isExcludedFromImportantSection(role: MailboxRole | undefined | null): boolean {
	if (!role) return false;
	return IMPORTANT_CLEAR_ON_MOVE_ROLES.has(role);
}
