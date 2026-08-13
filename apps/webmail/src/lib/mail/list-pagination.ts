export const FIRST_PAGE_SIZE = 20;
export const PAGE_SIZE = 50;

/** First Email/query page: small on a cold list, large enough to replace a cached page. */
export function firstPageLimit(alreadyShowingCount: number): number {
	if (alreadyShowingCount > FIRST_PAGE_SIZE) {
		return Math.min(PAGE_SIZE, alreadyShowingCount);
	}
	return FIRST_PAGE_SIZE;
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
