import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Search now renders in-place on the mailbox list (driven by ?q), so the old
// dedicated search route just forwards its query to the inbox.
export const load: PageServerLoad = ({ url }) => {
	const params = new URLSearchParams(url.search);
	params.delete('focus');
	const qs = params.toString();
	redirect(307, qs ? `/?${qs}` : '/');
};
