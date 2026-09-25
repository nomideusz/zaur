import { collapseMessagesByThread, listThreadSenderLabel } from '@zaur/mail-core';
import type { MessagePreview } from '@zaur/mail-core';

export type ListRow = MessagePreview & {
	senderLabel: string;
	/**
	 * The counterparty's address, not the latest message's `from` — on Sent (and
	 * on an inbox thread my own reply ends) those differ. It seeds the row's
	 * Hobday hue, so one person is one colour in the list, the reader and compose.
	 */
	senderEmail: string;
	/** Messages this folder view holds for the thread; > 1 earns a count chip. */
	messageCount: number;
};

export type RowGroup = {
	/** Monospace uppercase divider label: TODAY, YESTERDAY, or e.g. 12 MARCH */
	label: string;
	rows: ListRow[];
};

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(receivedAt: string, now: Date): string {
	const time = new Date(receivedAt);
	const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days === -1) return 'Tomorrow';
	const sameYear = time.getFullYear() === now.getFullYear();
	return time.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		...(sameYear ? {} : { year: 'numeric' })
	});
}

/**
 * Collapse messages into one row per thread, then group by the thread's date.
 * `folderId` drives the "To …" counterparty label on Sent-like folders;
 * `isMe` matches the session's account emails.
 */
export function buildRowGroups(
	messages: MessagePreview[],
	folderId: string,
	isMe: (email: string) => boolean,
	now = new Date()
): RowGroup[] {
	const collapsed = collapseMessagesByThread(messages);
	const threads = new Map<string, MessagePreview[]>();
	for (const message of messages) {
		const group = threads.get(message.threadId) ?? [];
		group.push(message);
		threads.set(message.threadId, group);
	}

	const rows: ListRow[] = collapsed.map((row) => {
		const threadMessages = threads.get(row.threadId) ?? [row];
		const sender = listThreadSenderLabel(threadMessages, folderId, isMe, false);
		return {
			...row,
			senderLabel: sender.label,
			senderEmail: sender.email || row.from.email,
			messageCount: threadMessages.length
		};
	});

	rows.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

	const groups: RowGroup[] = [];
	for (const row of rows) {
		const label = dayLabel(row.receivedAt, now);
		const last = groups[groups.length - 1];
		if (last && last.label === label) last.rows.push(row);
		else groups.push({ label, rows: [row] });
	}
	return groups;
}

/** List time: HH:MM today, weekday within a week, otherwise a short date. */
export function formatListTime(receivedAt: string, now = new Date()): string {
	const time = new Date(receivedAt);
	if (Number.isNaN(time.getTime())) return '';
	const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
	if (days <= 0)
		return time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	if (days < 7)
		return time.toLocaleDateString('en-GB', { weekday: 'short' });
	return time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatReaderTime(receivedAt: string, now = new Date()): string {
	const time = new Date(receivedAt);
	if (Number.isNaN(time.getTime())) return '';
	const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
	const hm = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	if (days === 0) return `Today ${hm}`;
	if (days === 1) return `Yesterday ${hm}`;
	return `${time.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: time.getFullYear() === now.getFullYear() ? undefined : 'numeric'
	})} ${hm}`;
}

/** 1–2 letter initials for an avatar tile. */
export function initials(name: string, email: string): string {
	const source = name.trim() || email.trim();
	if (!source) return '?';
	if (!name.trim() && source.includes('@')) {
		// Email without a display name: first two letters of the local part.
		return source.slice(0, source.indexOf('@')).slice(0, 2).toUpperCase();
	}
	const parts = source.split(/[\s@._-]+/).filter(Boolean);
	if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
	return ((parts[0]![0] ?? '') + (parts[1]![0] ?? '')).toUpperCase();
}

export function formatBytes(size: number): string {
	if (!Number.isFinite(size) || size <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const exponent = Math.min(Math.floor(Math.log2(size) / 10), units.length - 1);
	const value = size / 2 ** (10 * exponent);
	return `${exponent === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

/**
 * Where a message's attachment is fetched from. The bytes come through our own
 * endpoint rather than Stalwart's `downloadUrl` because that one wants the
 * account's credentials, which stay on the server.
 */
export function attachmentUrl(blobId: string, name: string, type: string, account?: string | null): string {
	const params = new URLSearchParams({ blobId, name, type });
	if (account) params.set('account', account);
	return `/api/download?${params}`;
}

export type PreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text';

/** Text is read into the page whole, so a big log or CSV downloads instead. */
export const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024;

/** Text-ish types shown as source: HTML and XML included, never rendered. */
const TEXT_TYPES = new Set([
	'text/plain',
	'text/csv',
	'text/markdown',
	'text/html',
	'text/css',
	'text/calendar',
	'text/xml',
	'application/json',
	'application/xml'
]);
const TEXT_EXTENSIONS = /\.(txt|csv|md|markdown|log|json|xml|ics|css)$/i;

/** What an attachment can be opened as in the preview, or null to download it. */
export function previewKind(attachment: { name: string; type: string; size: number }): PreviewKind | null {
	const type = attachment.type.toLowerCase().split(';')[0]!.trim();
	if (type === 'application/pdf' || /\.pdf$/i.test(attachment.name)) return 'pdf';
	if (type.startsWith('image/')) return 'image';
	if (type.startsWith('video/')) return 'video';
	if (type.startsWith('audio/')) return 'audio';
	const textual = TEXT_TYPES.has(type) || (type === 'application/octet-stream' && TEXT_EXTENSIONS.test(attachment.name));
	if (textual && attachment.size <= MAX_TEXT_PREVIEW_BYTES) return 'text';
	return null;
}

export function typeBadge(mime: string): string {
	const subtype = mime.split('/')[1] ?? mime;
	return subtype.split('+')[0]!.slice(0, 4).toUpperCase();
}

/**
 * Selection is by thread, JMAP acts on emails: expand the selected threads
 * back into every message id the current folder view holds for them.
 */
export function selectedEmailIds(
	messages: MessagePreview[] | undefined,
	selection: Set<string>
): string[] {
	if (!messages || selection.size === 0) return [];
	return messages.filter((message) => selection.has(message.threadId)).map((message) => message.id);
}
