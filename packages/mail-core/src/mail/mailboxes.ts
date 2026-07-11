import type { Mailbox, MailboxRole } from '../types/mail';

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
	important: 'Highlights',
	scheduled: 'Scheduled',
	memos: 'Memos',
	snoozed: 'Snoozed'
};

/**
 * Stalwart assigns a role to every default folder it creates (including the
 * extended important/scheduled/memos/snoozed roles), so the role is the sole
 * source of truth; folders without a recognized role are custom. Legacy server
 * names ("E-mails", "Bin", …) are handled by aliases in Stalwart's
 * defaultFolders config, not here.
 */
const JMAP_ROLE_TO_KIND: Partial<Record<string, MailboxKind>> = {
	inbox: 'inbox',
	drafts: 'drafts',
	sent: 'sent',
	archive: 'archive',
	junk: 'junk',
	spam: 'junk',
	trash: 'trash',
	important: 'important',
	scheduled: 'scheduled',
	memos: 'memos',
	snoozed: 'snoozed'
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

/** Roles always shown in the mail sidebar and mobile mailbox picker. */
export const PRIMARY_SIDEBAR_MAILBOX_ROLES = [
	'inbox',
	'important',
	'drafts',
	'sent',
	'junk',
	'trash'
] as const satisfies readonly MailboxRole[];

export type PrimarySidebarMailboxRole = (typeof PRIMARY_SIDEBAR_MAILBOX_ROLES)[number];

const PRIMARY_SIDEBAR_ROLE_ORDER = new Map<MailboxRole, number>(
	PRIMARY_SIDEBAR_MAILBOX_ROLES.map((role, index) => [role, index])
);

export function isPrimarySidebarMailbox(
	role: MailboxRole | undefined
): role is PrimarySidebarMailboxRole {
	return !!role && PRIMARY_SIDEBAR_ROLE_ORDER.has(role);
}

/** Roles shown in the sidebar only while they contain messages. */
const CONDITIONAL_SIDEBAR_MAILBOX_ROLES = new Set<MailboxRole>([
	'archive',
	'scheduled',
	'snoozed',
	'memos'
]);

const SIDEBAR_ROLE_ORDER = new Map<MailboxRole, number>(
	(
		[
			'inbox',
			'important',
			'drafts',
			'sent',
			'scheduled',
			'snoozed',
			'memos',
			'archive',
			'junk',
			'trash'
		] satisfies MailboxRole[]
	).map((role, index) => [role, index])
);

function sidebarRoleRank(role: MailboxRole | undefined): number {
	if (!role) return 99;
	return SIDEBAR_ROLE_ORDER.get(role) ?? 99;
}

export interface SidebarMailboxGroups {
	/** Role-tagged folders in fixed display order. */
	system: Mailbox[];
	/** User-created folders, alphabetical. */
	custom: Mailbox[];
}

export function sidebarMailboxGroups(mailboxes: readonly Mailbox[]): SidebarMailboxGroups {
	const system: Mailbox[] = [];
	const custom: Mailbox[] = [];

	for (const mb of mailboxes) {
		if (isPrimarySidebarMailbox(mb.role)) {
			system.push(mb);
		} else if (mb.role && CONDITIONAL_SIDEBAR_MAILBOX_ROLES.has(mb.role)) {
			if (mb.total > 0) system.push(mb);
		} else {
			custom.push(mb);
		}
	}

	system.sort(
		(a, b) => sidebarRoleRank(a.role) - sidebarRoleRank(b.role) || a.name.localeCompare(b.name)
	);
	custom.sort((a, b) => a.name.localeCompare(b.name));

	return { system, custom };
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
