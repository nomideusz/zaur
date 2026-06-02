import { redirect } from '@sveltejs/kit';
import { readSession } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, url }) => {
	// if (!readSession(cookies)) {
	// 	const next = `${url.pathname}${url.search}`;
	// 	redirect(303, `/login?next=${encodeURIComponent(next)}`);
	// }

	return {};
};
