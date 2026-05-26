import type { Mailbox } from '$lib/types/mail';

export interface MailboxNode extends Mailbox {
	children: MailboxNode[];
}

export function buildMailboxTree(mailboxes: Mailbox[]): MailboxNode[] {
	const nodes = mailboxes.map((mb) => ({ ...mb, children: [] as MailboxNode[] }));
	const byJmapId = new Map<string, MailboxNode>();

	for (const node of nodes) {
		if (node.jmapId) byJmapId.set(node.jmapId, node);
	}

	const roots: MailboxNode[] = [];

	for (const node of nodes) {
		const parent = node.parentId ? byJmapId.get(node.parentId) : undefined;
		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}
