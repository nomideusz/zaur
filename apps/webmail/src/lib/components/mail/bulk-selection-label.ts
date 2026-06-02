import type { MessagePreview } from '$lib/types/mail';

export function bulkSelectionCounts(
	messages: MessagePreview[],
	selectedIds: readonly string[]
): { notImportant: number; important: number } {
	const selected = new Set(selectedIds);
	let notImportant = 0;
	let important = 0;
	for (const message of messages) {
		if (!selected.has(message.id)) continue;
		if (message.important) important += 1;
		else notImportant += 1;
	}
	return { notImportant, important };
}

export function bulkSelectionLabel(input: {
	selectedCount: number;
	notImportantCount: number;
	importantCount: number;
	canMarkImportant: boolean;
}): string {
	const { selectedCount, notImportantCount, importantCount, canMarkImportant } = input;
	if (canMarkImportant && notImportantCount > 0) {
		return `Mark ${notImportantCount} important`;
	}
	if (importantCount > 0) {
		return `Remove ${importantCount} important`;
	}
	return `${selectedCount} selected`;
}

/** Primary action already shown in the selection label — hide the matching icon button. */
export function bulkSelectionPrimaryAction(input: {
	notImportantCount: number;
	importantCount: number;
	canMarkImportant: boolean;
}): 'mark-important' | 'remove-important' | null {
	const { notImportantCount, importantCount, canMarkImportant } = input;
	if (canMarkImportant && notImportantCount > 0) return 'mark-important';
	if (importantCount > 0) return 'remove-important';
	return null;
}
