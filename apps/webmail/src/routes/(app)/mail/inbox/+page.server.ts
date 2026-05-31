import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Inbox list lives at `/`; keep `/mail/inbox` as a stable alias. */
export const load: PageServerLoad = async () => {
	redirect(307, '/');
};
