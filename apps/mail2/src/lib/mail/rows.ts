import { collapseMessagesByThread, listThreadSenderLabel } from '@zaur/mail-core';
import type { MessagePreview } from '@zaur/mail-core';

export type ListRow = MessagePreview & { senderLabel: string };

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

	const rows: ListRow[] = collapsed.map((row) => ({
		...row,
		senderLabel: listThreadSenderLabel(threads.get(row.threadId) ?? [row], folderId, isMe, false)
			.label
	}));

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
	return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
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
