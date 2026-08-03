/** Pure helpers for bulk-select filter menus and star chords. */

export type SelectionFilter = 'all' | 'normal' | 'new' | 'none' | 'important';

export type SelectableMessage = {
	id: string;
	unread: boolean;
	important: boolean;
};

export function filterMessagesForSelection<T extends SelectableMessage>(
	list: readonly T[],
	filter: SelectionFilter
): T[] {
	if (filter === 'none') return [];
	return list.filter((message) => {
		if (filter === 'all') return true;
		if (filter === 'normal') return !message.unread && !message.important;
		if (filter === 'important') return message.important;
		return message.unread;
	});
}

/**
 * Paint-first bulk mark contract: selection clears and local unread flags flip
 * before the network promise settles.
 */
export function applyOptimisticMarkSeen<T extends SelectableMessage>(
	selected: readonly T[]
): { clearedSelection: true; nextUnread: Record<string, boolean> } {
	const nextUnread: Record<string, boolean> = {};
	for (const message of selected) {
		nextUnread[message.id] = false;
	}
	return { clearedSelection: true, nextUnread };
}
