import { redirect } from '@sveltejs/kit';
import { isPasswordResetEnabled } from '#lib/server/recovery';
import type { PageServerLoad } from './$types';

/**
 * `?email=` fills in the address; `?recovery=` is register's sign-up page
 * pointing at the invitation address, which is where the link will go.
 */
export const load: PageServerLoad = ({ url }) => {
	if (!isPasswordResetEnabled()) redirect(303, '/login');
	const recovery = url.searchParams.get('recovery')?.trim() ?? '';
	return { email: recovery || url.searchParams.get('email')?.trim() || '', viaRecovery: Boolean(recovery) };
};
