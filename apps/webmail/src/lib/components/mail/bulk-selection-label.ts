import type { MessagePreview } from '$lib/types/mail';
import { LABEL_UNSEEN } from '../../mail/new-mail.ts';

/** Inbox buckets — mutually exclusive; sum to selection size. */
export type BulkSelectionCounts = {
	new: number;
	important: number;
	normal: number;
	/** Selected messages that can be marked important. */
	notImportant: number;
};

export function bulkSelectionCounts(
	messages: MessagePreview[],
	selectedIds: readonly string[]
): BulkSelectionCounts {
	const selected = new Set(selectedIds);
	let newCount = 0;
	let important = 0;
	let normal = 0;
	let notImportant = 0;
	for (const message of messages) {
		if (!selected.has(message.id)) continue;
		if (message.unread) {
			newCount += 1;
		} else if (message.important) {
			important += 1;
		} else {
			normal += 1;
		}
		if (!message.important) notImportant += 1;
	}
	return { new: newCount, important, normal, notImportant };
}

export function bulkSelectionReadCount(counts: BulkSelectionCounts): number {
	return counts.normal + counts.important;
}

/** Neutral summary for the bulk header — buckets always add up. */
export function bulkSelectionSummary(
	selectedCount: number,
	counts: BulkSelectionCounts,
	unresolved = 0
): { headline: string; detail: string | null } {
	if (selectedCount === 0) return { headline: 'None selected', detail: null };

	const categorized = counts.new + counts.important + counts.normal;
	const parts: string[] = [];
	if (counts.new > 0) parts.push(`${counts.new} ${LABEL_UNSEEN.toLowerCase()}`);
	if (counts.important > 0) parts.push(`${counts.important} important`);
	if (counts.normal > 0) parts.push(`${counts.normal} normal`);
	if (unresolved > 0) parts.push(`${unresolved} unavailable`);

	if (parts.length === 1 && unresolved === 0 && categorized === selectedCount) {
		return { headline: parts[0]!, detail: null };
	}

	const detail = parts.length > 0 ? parts.join(' · ') : null;
	return {
		headline: `${selectedCount} selected`,
		detail
	};
}

/** Menu action label — adds count when the action affects a subset of the selection. */
export function bulkAffectedLabel(label: string, affected: number, selectedCount: number): string {
	if (affected <= 0 || affected === selectedCount) return label;
	return `${label} (${affected})`;
}
