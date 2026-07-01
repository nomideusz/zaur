import {
	bulkAffectedLabel,
	bulkSelectionReadCount,
	type BulkSelectionCounts
} from './bulk-selection-label.ts';
import {
	LABEL_MARK_IMPORTANT,
	LABEL_MARK_SEEN,
	LABEL_NOT_IMPORTANT,
	LABEL_UNSEE
} from '../../mail/new-mail.ts';

export type BulkBarActionId =
	| 'unsee'
	| 'mark-seen'
	| 'important'
	| 'not-important'
	| 'spam'
	| 'trash'
	| 'cancel';

export type BulkBarAction = {
	id: BulkBarActionId;
	label: string;
	variant: 'link' | 'danger';
	/** Inline display priority — lower goes inline first (1 = Highlight, always inline). */
	priority: number;
};

export function bulkBarActions(options: {
	counts: BulkSelectionCounts;
	selectedCount: number;
	canMarkImportant: boolean;
	/** Spam folder exists and the current view isn't Spam/Trash/Drafts/Sent. */
	canMarkSpam?: boolean;
	deleteLabel: string;
}): BulkBarAction[] {
	const { counts, selectedCount, canMarkImportant, canMarkSpam = false, deleteLabel } = options;
	const readCount = bulkSelectionReadCount(counts);
	const actions: BulkBarAction[] = [];

	if (readCount > 0) {
		actions.push({
			id: 'unsee',
			label: bulkAffectedLabel(LABEL_UNSEE, readCount, selectedCount),
			variant: 'link',
			priority: 2
		});
	}

	if (counts.new > 0) {
		actions.push({
			id: 'mark-seen',
			label: bulkAffectedLabel(LABEL_MARK_SEEN, counts.new, selectedCount),
			variant: 'link',
			priority: 2
		});
	}

	if (canMarkImportant && counts.notImportant > 0) {
		actions.push({
			id: 'important',
			label: bulkAffectedLabel(LABEL_MARK_IMPORTANT, counts.notImportant, selectedCount),
			variant: 'link',
			priority: 1
		});
	}

	if (canMarkImportant && counts.important > 0) {
		actions.push({
			id: 'not-important',
			label: bulkAffectedLabel(LABEL_NOT_IMPORTANT, counts.important, selectedCount),
			variant: 'link',
			priority: 1
		});
	}

	if (canMarkSpam) {
		actions.push({ id: 'spam', label: 'Mark spam', variant: 'link', priority: 3 });
	}

	actions.push({ id: 'trash', label: deleteLabel, variant: 'danger', priority: 0 });
	actions.push({ id: 'cancel', label: 'Cancel', variant: 'link', priority: 99 });

	return actions;
}

/** Rough rendered width of an inline action button (icon + gap + label + padding). */
export function estimateBulkActionWidth(action: Pick<BulkBarAction, 'label'>): number {
	return 46 + action.label.length * 7.5;
}

/**
 * Split mark actions into inline buttons and overflow-menu entries based on
 * the measured width of the actions area. The highest-priority action
 * (Highlight) always stays inline regardless of space.
 */
export function fitBulkActions(
	actions: BulkBarAction[],
	availableWidth: number,
	options?: { reservedWidth?: number; actionWidth?: number }
): { inline: BulkBarAction[]; overflow: BulkBarAction[] } {
	// Trash button + separators + the More trigger itself.
	const reserved = options?.reservedWidth ?? 150;
	const byPriority = [...actions].sort((a, b) => a.priority - b.priority);

	const inlineIds = new Set<BulkBarActionId>();
	let used = reserved;
	for (const action of byPriority) {
		const width = options?.actionWidth ?? estimateBulkActionWidth(action);
		// Priority 1 (Highlight family) always stays inline.
		if (action.priority <= 1 || used + width <= availableWidth) {
			inlineIds.add(action.id);
			used += width;
		}
	}

	return {
		inline: actions.filter((action) => inlineIds.has(action.id)),
		overflow: actions.filter((action) => !inlineIds.has(action.id))
	};
}
