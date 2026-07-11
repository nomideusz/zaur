import { redirect } from '@sveltejs/kit';
import { isPasswordResetEnabled } from '$lib/server/register-api';
import type { PageServerLoad } from './$types';

// Reset proxies to the register service; without one there is nothing to show.
export const load: PageServerLoad = () => {
	if (!isPasswordResetEnabled()) {
		redirect(302, '/login');
	}
	return {};
};
