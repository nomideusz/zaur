import { redirect } from '@sveltejs/kit';
import type { User } from '#lib/types';

/** The signed-in account for a page load; everyone else goes through Zaur sign-in and back. */
export function signedIn({ locals, url }: { locals: App.Locals; url: URL }): User {
	if (!locals.user) redirect(303, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	return locals.user;
}

/** The signed-in account for an /api endpoint (the hook already turned the rest away). */
export const apiUser = (locals: App.Locals): User => locals.user!;
