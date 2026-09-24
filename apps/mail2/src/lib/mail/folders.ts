/**
 * Mailboxes in sidebar order: each parent, then its children, siblings in the
 * order given. `depth` is the indent. A parent the list does not hold (or a
 * cycle, which JMAP forbids anyway) leaves its children at the top level.
 */
export function treeOrder<T extends { id: string; parentId: string | null }>(
	sorted: T[]
): (T & { depth: number })[] {
	const ids = new Set(sorted.map((mailbox) => mailbox.id));
	const children = new Map<string | null, T[]>();
	for (const mailbox of sorted) {
		const parent = mailbox.parentId && ids.has(mailbox.parentId) ? mailbox.parentId : null;
		children.set(parent, [...(children.get(parent) ?? []), mailbox]);
	}
	const out: (T & { depth: number })[] = [];
	const walk = (parent: string | null, depth: number) => {
		for (const mailbox of children.get(parent) ?? []) {
			out.push({ ...mailbox, depth });
			walk(mailbox.id, depth + 1);
		}
	};
	walk(null, 0);
	return out;
}

/** A tree-ordered list without `self` and everything inside it: where `self` can move to. */
export function withoutBranch<T extends { id: string; depth: number }>(list: T[], self: { id: string } | null): T[] {
	const at = self ? list.findIndex((item) => item.id === self.id) : -1;
	if (at < 0) return list;
	let end = at + 1;
	while (end < list.length && list[end]!.depth > list[at]!.depth) end += 1;
	return [...list.slice(0, at), ...list.slice(end)];
}
