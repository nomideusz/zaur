import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return { mailboxId: params.mailbox, threadId: params.threadId };
};
