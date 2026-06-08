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
	| 'trash'
	| 'cancel';

export type BulkBarAction = {
	id: BulkBarActionId;
	label: string;
	variant: 'link' | 'danger';
};

export function bulkBarActions(options: {
	counts: BulkSelectionCounts;
	selectedCount: number;
	canMarkImportant: boolean;
	deleteLabel: string;
}): BulkBarAction[] {
	const { counts, selectedCount, canMarkImportant, deleteLabel } = options;
	const readCount = bulkSelectionReadCount(counts);
	const actions: BulkBarAction[] = [];

	if (readCount > 0) {
		actions.push({
			id: 'unsee',
			label: bulkAffectedLabel(LABEL_UNSEE, readCount, selectedCount),
			variant: 'link'
		});
	}

	if (counts.new > 0) {
		actions.push({
			id: 'mark-seen',
			label: bulkAffectedLabel(LABEL_MARK_SEEN, counts.new, selectedCount),
			variant: 'link'
		});
	}

	if (canMarkImportant && counts.notImportant > 0) {
		actions.push({
			id: 'important',
			label: bulkAffectedLabel(LABEL_MARK_IMPORTANT, counts.notImportant, selectedCount),
			variant: 'link'
		});
	}

	if (canMarkImportant && counts.important > 0) {
		actions.push({
			id: 'not-important',
			label: bulkAffectedLabel(LABEL_NOT_IMPORTANT, counts.important, selectedCount),
			variant: 'link'
		});
	}

	actions.push({ id: 'trash', label: deleteLabel, variant: 'danger' });
	actions.push({ id: 'cancel', label: 'Cancel', variant: 'link' });

	return actions;
}
