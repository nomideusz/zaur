import { redirect } from '@sveltejs/kit';
import { INBOX_MAILBOX_ROUTE_ID } from '$lib/mail/routes';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (params.mailbox === INBOX_MAILBOX_ROUTE_ID) {
		redirect(307, '/');
	}
	return { mailboxId: params.mailbox };
};
