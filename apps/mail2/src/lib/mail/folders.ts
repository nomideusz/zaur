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

/**
 * Can mail be moved into this folder by hand — a drop, a "Move to" menu, the
 * bulk bar? Not into Drafts: whatever is there opens as your own draft, and
 * its first autosave replaces the original. Not into Scheduled: nothing filed
 * there is sent. Every way to move mail asks here, so they cannot disagree.
 */
export function acceptsMoves(box: { kind: string }): boolean {
	return box.kind !== 'drafts' && box.kind !== 'scheduled';
}

/**
 * Of these messages, the ones still filed in `mailboxId`: all a destroy asked
 * for from that folder may touch. A row left on screen after an Undo, or after
 * a move made on another device, names a message that lives somewhere else now.
 */
export function stillIn(emails: { id: string; mailboxIds?: Record<string, boolean> }[], mailboxId: string): string[] {
	return emails.filter((email) => email.mailboxIds?.[mailboxId] === true).map((email) => email.id);
}

/**
 * The folder an address names: `?folder=` in your own mailbox or, with
 * `?shared=`, in that one. The inbox without it, and for an id the mailbox
 * does not hold. Null while that mailbox is not loaded, or no longer shared.
 */
export function mailboxOfUrl<T extends { id: string; kind: string }>(
	params: URLSearchParams,
	own: readonly T[] | undefined,
	shared: readonly { id: string; mailboxes: readonly T[] }[] | undefined
): { id: string; account: string | null } | null {
	const account = params.get('shared');
	const list = account ? shared?.find((one) => one.id === account)?.mailboxes : own;
	const folder = params.get('folder');
	const box = list?.find((one) => one.id === folder) ?? list?.find((one) => one.kind === 'inbox') ?? list?.[0];
	return box ? { id: box.id, account } : null;
}
