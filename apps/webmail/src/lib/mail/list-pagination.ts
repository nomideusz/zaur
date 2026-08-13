export const FIRST_PAGE_SIZE = 20;
export const PAGE_SIZE = 50;

/** First Email/query page: small on a cold list, large enough to replace a cached page. */
export function firstPageLimit(alreadyShowingCount: number): number {
	if (alreadyShowingCount > FIRST_PAGE_SIZE) {
		return Math.min(PAGE_SIZE, alreadyShowingCount);
	}
	return FIRST_PAGE_SIZE;
}

/** Folder / Unseen / Highlights header + pagination catalog — never a query page size. */
export function resolveListTotal(options: {
	loadedCount: number;
	mailboxTotal: number;
	mailboxUnread: number;
	queryTotal: number | null;
	unseenOnly: boolean;
}): number {
	const loaded = Math.max(0, options.loadedCount);
	if (options.unseenOnly) {
		return Math.max(loaded, options.queryTotal ?? options.mailboxUnread);
	}
	return Math.max(loaded, options.mailboxTotal, options.queryTotal ?? 0);
}

export function listHasMoreAfterBatch(options: {
	hasMoreFromQuery: boolean;
	lastBatchSize?: number;
	requestedLimit: number;
	queryOffset: number;
	catalogTotal: number;
}): boolean {
	if (options.lastBatchSize === 0) return false;
	if (options.lastBatchSize !== undefined && options.lastBatchSize < options.requestedLimit) {
		return false;
	}
	return options.hasMoreFromQuery || options.queryOffset < options.catalogTotal;
}
