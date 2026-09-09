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
	| 'restore'
	| 'trash'
	| 'cancel';

export type BulkBarAction = {
	id: BulkBarActionId;
	label: string;
	/** Compact label for the phone dock, where full sentences wrap. */
	short: string;
	variant: 'link' | 'danger';
};

export function bulkBarActions(options: {
	counts: BulkSelectionCounts;
	selectedCount: number;
	canMarkImportant: boolean;
	/** Spam folder exists and the current view isn't Spam/Trash/Drafts/Sent. */
	canMarkSpam?: boolean;
	/** Inbox exists and the current view is Spam, Trash, or Archive. */
	canRestore?: boolean;
	restoreLabel?: string;
	restoreShortLabel?: string;
	deleteLabel: string;
	deleteShortLabel?: string;
}): BulkBarAction[] {
	const {
		counts,
		selectedCount,
		canMarkImportant,
		canMarkSpam = false,
		canRestore = false,
		restoreLabel = 'Move to inbox',
		restoreShortLabel = 'Inbox',
		deleteLabel,
		deleteShortLabel = 'Trash'
	} = options;
	const readCount = bulkSelectionReadCount(counts);
	const actions: BulkBarAction[] = [];

	if (readCount > 0) {
		actions.push({
			id: 'unsee',
			label: bulkAffectedLabel(LABEL_UNSEE, readCount, selectedCount),
			short: 'Unread',
			variant: 'link'
		});
	}

	if (counts.new > 0) {
		actions.push({
			id: 'mark-seen',
			label: bulkAffectedLabel(LABEL_MARK_SEEN, counts.new, selectedCount),
			short: 'Read',
			variant: 'link'
		});
	}

	if (canMarkImportant && counts.notImportant > 0) {
		actions.push({
			id: 'important',
			label: bulkAffectedLabel(LABEL_MARK_IMPORTANT, counts.notImportant, selectedCount),
			short: 'Highlight',
			variant: 'link'
		});
	}

	if (canMarkImportant && counts.important > 0) {
		actions.push({
			id: 'not-important',
			label: bulkAffectedLabel(LABEL_NOT_IMPORTANT, counts.important, selectedCount),
			short: 'Unhighlight',
			variant: 'link'
		});
	}

	if (canRestore) {
		actions.push({
			id: 'restore',
			label: restoreLabel,
			short: restoreShortLabel,
			variant: 'link'
		});
	}

	if (canMarkSpam) {
		actions.push({ id: 'spam', label: 'Mark spam', short: 'Spam', variant: 'link' });
	}

	actions.push({
		id: 'trash',
		label: deleteLabel,
		short: deleteShortLabel,
		variant: 'danger'
	});
	actions.push({ id: 'cancel', label: 'Cancel', short: 'Cancel', variant: 'link' });

	return actions;
}
