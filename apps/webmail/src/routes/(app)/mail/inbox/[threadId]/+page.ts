import { INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return { mailboxId: INBOX_MAILBOX_ROUTE_ID, threadId: params.threadId };
};
