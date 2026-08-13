/** Whether an Email/query page has more rows when `total` may be omitted. */
export function emailQueryHasMore(options: {
	position: number;
	idCount: number;
	limit: number;
	total?: number;
}): boolean {
	if (typeof options.total === 'number') {
		return options.position + options.idCount < options.total;
	}
	return options.idCount >= options.limit;
}
